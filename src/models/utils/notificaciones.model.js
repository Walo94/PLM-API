import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

// Helper para obtener fecha en zona horaria México
const getFechaMexico = () => {
  const fechaActual = new Date();
  return new Date(
    fechaActual.toLocaleString("en-US", { timeZone: "America/Mexico_City" })
  );
};

export const NotificacionModel = {
  /**
   * 1. CREAR INDIVIDUAL: Registra una notificación para una sola persona.
   */
  createIndividual: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const fechaMexico = getFechaMexico();

    const result = await connection
      .request()
      .input("usuarioId", sql.SmallInt, data.usuarioId)
      .input("contenido", sql.NVarChar(255), data.contenido)
      .input("url", sql.VarChar(50), data.url || null)
      .input("rutaId", sql.SmallInt, data.rutaId || null)
      .input("fecha", sql.DateTime, fechaMexico).query(`
        INSERT INTO dbo.Notificaciones (UsuarioId, EquipoId, Contenido, URL, RutaId, Fecha, Leida) 
        OUTPUT INSERTED.id, INSERTED.Fecha
        VALUES (@usuarioId, NULL, @contenido, @url, @rutaId, @fecha, 'N')
      `);

    return {
      id: result.recordset[0].id,
      fecha: result.recordset[0].Fecha,
      ...data,
    };
  },

  /**
   * 2. CREAR GRUPAL: Registra UNA sola notificación ligada a un EquipoId.
   */
  createGrupal: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const fechaMexico = getFechaMexico();

    const result = await connection
      .request()
      .input("equipoId", sql.SmallInt, data.equipoId)
      .input("contenido", sql.NVarChar(255), data.contenido)
      .input("url", sql.VarChar(50), data.url || null)
      .input("rutaId", sql.SmallInt, data.rutaId || null)
      .input("fecha", sql.DateTime, fechaMexico).query(`
        INSERT INTO dbo.Notificaciones (UsuarioId, EquipoId, Contenido, URL, RutaId, Fecha, Leida) 
        OUTPUT INSERTED.id, INSERTED.Fecha
        VALUES (NULL, @equipoId, @contenido, @url, @rutaId, @fecha, 'N')
      `);

    return {
      id: result.recordset[0].id,
      fecha: result.recordset[0].Fecha,
      ...data,
    };
  },

  /**
   * 3. CREAR MASIVA (LISTA): Recibe un array de IDs y crea N registros.
   * @param {object} data - debe contener un array 'usuariosIds': [1, 2, 5]
   */
  createMasiva: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();
      const fechaMexico = getFechaMexico();

      // CAMBIO: Array de objetos en lugar de solo IDs
      const insertados = [];

      const equipoIdRef = data.equipoId || null;

      for (const userId of data.usuariosIds) {
        const request = transaction.request();

        request.input("usuarioId", sql.SmallInt, userId);
        request.input("equipoId", sql.SmallInt, equipoIdRef);
        request.input("contenido", sql.NVarChar(255), data.contenido);
        request.input("url", sql.VarChar(50), data.url || null);
        request.input("rutaId", sql.SmallInt, data.rutaId || null);
        request.input("fecha", sql.DateTime, fechaMexico);

        const result = await request.query(`
           INSERT INTO dbo.Notificaciones (UsuarioId, EquipoId, Contenido, URL, RutaId, Fecha, Leida) 
           OUTPUT INSERTED.id
           VALUES (@usuarioId, @equipoId, @contenido, @url, @rutaId, @fecha, 'N')
        `);

        insertados.push({
          id: result.recordset[0].id,
          usuarioId: userId,
        });
      }

      await transaction.commit();
      return {
        mensaje: "Notificaciones masivas creadas",
        cantidad: insertados.length,
        datos: insertados,
      };
    } catch (err) {
      console.error("Error en createMasiva, rollback...", err);
      await transaction.rollback();
      throw err;
    }
  },

  /* Obtener miembros de un equipo
   * Extrae los IDs del JSON column 'Personas' en la tabla Equipos
   */
  getMiembrosEquipo: async (equipoId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    // Usamos OPENJSON para convertir el array JSON en filas
    const query = `
      SELECT jsonId as id
      FROM dbo.Equipos
      CROSS APPLY OPENJSON(Personas) WITH (jsonId int '$.id')
      WHERE id = @equipoId
    `;

    const result = await connection
      .request()
      .input("equipoId", sql.SmallInt, equipoId)
      .query(query);

    // Retorna array de números: [1, 2, 5, ...]
    return result.recordset.map((r) => r.id);
  },

  /**
   * OBTENER NOTIFICACIONES POR USUARIO
   * Trae las directas (PersonaId) Y las de grupo (EquipoId) validando el JSON en Equipos.Personas
   */
  getByUsuarioId: async (usuarioId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const query = `
        SELECT 
          n.id, n.Fecha, n.Leida, n.Contenido, n.URL,
          ISNULL(n.UsuarioId, 0) AS UsuarioId,
          ISNULL(n.EquipoId, 0) AS EquipoId, -- Sirve para poner el icono de Grupo
          ISNULL(n.RutaId, 0) AS RutaId,
          ISNULL(p.Usuario, '') AS NombrePersona,
          ISNULL(e.Nombre, '') AS NombreEquipo,
          ISNULL(r.Nombre, '') AS NombreRuta
        FROM dbo.Notificaciones n
        LEFT JOIN dbo.Usuarios p ON n.UsuarioId = p.id
        LEFT JOIN dbo.Equipos e ON n.EquipoId = e.id
        LEFT JOIN dbo.Rutas r ON n.RutaId = r.id
        WHERE 
          n.UsuarioId = @usuarioId
        ORDER BY n.Fecha DESC
    `;

    const result = await connection
      .request()
      .input("usuarioId", sql.SmallInt, usuarioId)
      .query(query);

    return result.recordset;
  },

  getById: async (id) => {
    // ... (Mismo código que en la respuesta anterior para getById) ...
    // Asegúrate de incluirlo aquí para que el controller funcione al devolver la data creada
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection.request().input("id", sql.Int, id).query(`
        SELECT n.id, n.Fecha, n.Leida, n.Contenido, n.URL,
        ISNULL(n.UsuarioId, 0) AS UsuarioId, ISNULL(n.EquipoId, 0) AS EquipoId, ISNULL(n.RutaId, 0) AS RutaId,
        ISNULL(p.Usuario, '') AS NombrePersona, ISNULL(e.Nombre, '') AS NombreEquipo, ISNULL(r.Nombre, '') AS NombreRuta
        FROM dbo.Notificaciones n
        LEFT JOIN dbo.Usuarios p ON n.UsuarioId = p.id
        LEFT JOIN dbo.Equipos e ON n.EquipoId = e.id
        LEFT JOIN dbo.Rutas r ON n.RutaId = r.id
        WHERE n.id = @id
     `);
    return result.recordset[0];
  },

  markAsRead: async (id) => {
    // ... (Mismo código anterior) ...
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection
      .request()
      .input("id", sql.Int, id)
      .query(`UPDATE dbo.Notificaciones SET Leida = 'S' WHERE id = @id`);
    return result.rowsAffected[0] > 0;
  },

  /**
   * MARCAR TODAS LAS NOTIFICACIONES DE UN USUARIO COMO LEÍDAS
   */
  markAllAsReadByUsuario: async (usuarioId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const result = await connection
      .request()
      .input("usuarioId", sql.SmallInt, usuarioId).query(`
        UPDATE dbo.Notificaciones 
        SET Leida = 'S' 
        WHERE UsuarioId = @usuarioId AND Leida = 'N'
      `);

    return result.rowsAffected[0];
  },

  /**
   * ELIMINAR UNA NOTIFICACIÓN POR ID
   */
  deleteById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const result = await connection
      .request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM dbo.Notificaciones WHERE id = @id`);

    return result.rowsAffected[0] > 0;
  },

  /**
   * ELIMINAR TODAS LAS NOTIFICACIONES DE UN USUARIO
   */
  deleteAllByUsuario: async (usuarioId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const result = await connection
      .request()
      .input("usuarioId", sql.SmallInt, usuarioId)
      .query(`DELETE FROM dbo.Notificaciones WHERE UsuarioId = @usuarioId`);

    return result.rowsAffected[0];
  },

  /**
   * ELIMINAR NOTIFICACIONES LEÍDAS DE UN USUARIO
   */
  deleteReadByUsuario: async (usuarioId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const result = await connection
      .request()
      .input("usuarioId", sql.SmallInt, usuarioId).query(`
        DELETE FROM dbo.Notificaciones 
        WHERE UsuarioId = @usuarioId AND Leida = 'S'
      `);

    return result.rowsAffected[0];
  },
};
