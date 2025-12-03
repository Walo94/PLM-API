import { connectDB } from "../../config/db.js";
import sql from "mssql";
import fs from "fs/promises";
import path from "path";

// Define la ruta base para el almacenamiento de archivos.
// Se recomienda usar una variable de entorno, pero para este ejemplo, usaremos una ruta fija.
const FILE_UPLOAD_BASE_PATH = "C:/PLM_Data/Equipos/";

const _getDbConfig = () => {
  return { pool: connectDB };
};

// --- Mensajes Model ---
export const MensajeModel = {
  /**
   * Crea un nuevo mensaje.
   * @param {object} data - Contenido, GrupoId, Tipo (TEXTO o ARCHIVO), PersonaId (quien envía)
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();
    try {
      await transaction.begin();
      const request = transaction.request();

      const fechaActual = new Date();
      const fechaMexico = new Date(
        fechaActual.toLocaleString("en-US", { timeZone: "America/Mexico_City" })
      );

      request.input("equipoId", sql.SmallInt, data.equipoId);
      request.input("usuarioId", sql.SmallInt, data.usuarioId);
      request.input("contenido", sql.NVarChar(sql.MAX), data.contenido);
      request.input("tipo", sql.VarChar(10), data.tipo);
      request.input("fechaEnvio", sql.DateTime, fechaMexico);

      const result = await request.query(
        `INSERT INTO dbo.Mensajes (EquipoId, UsuarioId, Contenido, Tipo, FechaEnvio) 
         OUTPUT INSERTED.Id, INSERTED.FechaEnvio
         VALUES (@equipoId, @usuarioId, @contenido, @tipo, @fechaEnvio)`
      );

      await transaction.commit();

      const nuevoId = result.recordset[0].Id;
      const fechaEnvio = result.recordset[0].FechaEnvio;

      return {
        id: nuevoId,
        equipoId: data.equipoId,
        usuarioId: data.usuarioId,
        contenido: data.contenido,
        tipo: data.tipo,
        fechaEnvio: fechaEnvio,
      };
    } catch (err) {
      console.error(
        "Error en la transacción de CREAR Mensaje, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene todos los mensajes de un equipo por su EquipoId.
   */
  getByEquipoId: async (equipoId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    // Nota: Se recomienda incluir un JOIN a la tabla Personas para obtener el nombre del remitente
    // y un JOIN a ArchivosEquipos si el Tipo es 'ARCHIVO' para obtener los detalles.
    const result = await connection
      .request()
      .input("equipoId", sql.SmallInt, equipoId).query(`
        SELECT 
          m.Id, 
          m.EquipoId, 
          m.UsuarioId, 
          m.Contenido, 
          m.Tipo, 
          m.FechaEnvio,
          u.Usuario AS NombrePersona
        FROM dbo.Mensajes m
        JOIN dbo.Usuarios u ON m.UsuarioId = u.Id
        WHERE m.EquipoId = @equipoId
        ORDER BY m.FechaEnvio ASC
      `);

    return result.recordset.map((record) => ({
      id: record.Id,
      equipoId: record.EquipoId,
      usuarioId: record.UsuarioId,
      contenido: record.Contenido,
      tipo: record.Tipo,
      fechaEnvio: record.FechaEnvio,
      nombrePersona: record.NombrePersona,
    }));
  },

  /**
   * Elimina un mensaje por su ID.
   */
  deleteById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();
      const request = transaction.request();

      request.input("id", sql.Int, id);

      const result = await request.query(
        `DELETE FROM dbo.Mensajes WHERE Id = @id`
      );

      await transaction.commit();
      return result.rowsAffected[0] > 0; // Retorna true si se eliminó
    } catch (err) {
      console.error(
        "Error en la transacción de ELIMINAR Mensaje, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene un mensaje por su ID con el nombre de la persona.
   */
  getById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const result = await connection.request().input("id", sql.Int, id).query(`
      SELECT 
        m.Id, 
        m.EquipoId, 
        m.UsuarioId, 
        m.Contenido, 
        m.Tipo, 
        m.FechaEnvio,
        p.Usuario AS NombrePersona
      FROM dbo.Mensajes m
      JOIN dbo.Usuarios p ON m.UsuarioId = p.Id
      WHERE m.Id = @id
    `);

    if (result.recordset.length === 0) return null;

    const record = result.recordset[0];
    return {
      id: record.Id,
      equipoId: record.EquipoId,
      usuarioId: record.UsuarioId,
      contenido: record.Contenido,
      tipo: record.Tipo,
      fechaEnvio: record.FechaEnvio,
      nombrePersona: record.NombrePersona,
    };
  },
};

// --- ArchivosEquipos Model ---
export const ArchivoEquipoModel = {
  /**
   * Crea la ruta de almacenamiento completa.
   * La estructura de carpetas es BASE_PATH/EquipoId/
   * @param {number} equipoId
   */
  _getStoragePath: (equipoId) => {
    return path.join(FILE_UPLOAD_BASE_PATH, equipoId.toString());
  },

  /**
   * Asegura que el directorio para el equipo exista.
   * @param {number} equipoId
   */
  _ensureDirectoryExists: async (equipoId) => {
    const dir = ArchivoEquipoModel._getStoragePath(equipoId);
    try {
      await fs.mkdir(dir, { recursive: true });
      return dir;
    } catch (error) {
      console.error(`Error al crear el directorio ${dir}:`, error);
      throw new Error(
        "No se pudo crear la carpeta de almacenamiento de archivos."
      );
    }
  },

  /**
   * Registra un archivo en la base de datos.
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();
    try {
      await transaction.begin();
      const request = transaction.request();

      const fechaActual = new Date();
      const fechaMexico = new Date(
        fechaActual.toLocaleString("en-US", { timeZone: "America/Mexico_City" })
      );

      request.input("equipoId", sql.SmallInt, data.equipoId);
      request.input("usuarioId", sql.SmallInt, data.usuarioId);
      request.input("nombreArchivo", sql.NVarChar(255), data.nombreArchivo);
      request.input(
        "rutaAlmacenamiento",
        sql.VarChar(500),
        data.rutaAlmacenamiento
      );
      request.input("tipoMime", sql.VarChar(100), data.tipoMime);
      request.input("tamano", sql.Int, data.tamano);
      request.input("fechaSubida", sql.DateTime, fechaMexico);

      const result = await request.query(
        `INSERT INTO dbo.ArchivosEquipos (EquipoId, UsuarioId, NombreArchivo, RutaAlmacenamiento, TipoMime, Tamano, FechaSubida) 
         OUTPUT INSERTED.Id, INSERTED.FechaSubida
         VALUES (@equipoId, @usuarioId, @nombreArchivo, @rutaAlmacenamiento, @tipoMime, @tamano, @fechaSubida)`
      );

      await transaction.commit();
      const nuevoId = result.recordset[0].Id;
      const fechaSubida = result.recordset[0].FechaSubida;

      return { id: nuevoId, ...data, fechaSubida };
    } catch (err) {
      console.error(
        "Error en la transacción de CREAR ArchivoEquipo, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene todos los archivos de un grupo por su GrupoId.
   */
  getByEquipoId: async (equipoId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    // De igual forma, se recomienda hacer JOIN a Personas para mostrar quién subió el archivo.
    const result = await connection
      .request()
      .input("equipoId", sql.SmallInt, equipoId).query(`
        SELECT 
          a.Id, 
          a.EquipoId, 
          a.UsuarioId, 
          a.NombreArchivo, 
          a.RutaAlmacenamiento, 
          a.TipoMime, 
          a.Tamano, 
          a.FechaSubida,
          p.Usuario AS UsuarioPersona
        FROM dbo.ArchivosEquipos a
        JOIN dbo.Usuarios p ON a.UsuarioId = p.Id
        WHERE a.EquipoId = @equipoId
        ORDER BY a.FechaSubida DESC
      `);

    return result.recordset.map((record) => ({
      id: record.Id,
      equipoId: record.EquipoId,
      usuarioId: record.UsuarioId,
      nombreArchivo: record.NombreArchivo,
      rutaAlmacenamiento: record.RutaAlmacenamiento,
      tipoMime: record.TipoMime,
      tamano: record.Tamano,
      fechaSubida: record.FechaSubida,
      nombrePersona: record.UsuarioPersona,
    }));
  },

  /**
   * Obtiene un archivo por su ID para descargar o eliminar.
   */
  getById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const result = await connection.request().input("id", sql.Int, id).query(`
    SELECT 
      a.Id, 
      a.EquipoId, 
      a.UsuarioId, 
      a.NombreArchivo, 
      a.RutaAlmacenamiento, 
      a.TipoMime, 
      a.Tamano, 
      a.FechaSubida,
      p.Usuario AS UsuarioPersona
    FROM dbo.ArchivosEquipos a
    JOIN dbo.Usuarios p ON a.UsuarioId = p.Id
    WHERE a.Id = @id
  `);

    if (result.recordset.length === 0) return null;

    const record = result.recordset[0];
    return {
      Id: record.Id,
      EquipoId: record.EquipoId,
      UsuarioId: record.UsuarioId,
      NombreArchivo: record.NombreArchivo,
      RutaAlmacenamiento: record.RutaAlmacenamiento,
      TipoMime: record.TipoMime,
      Tamano: record.Tamano,
      FechaSubida: record.FechaSubida,
      nombrePersona: record.UsuarioPersona,
    };
  },

  /**
   * Elimina un archivo de la BD y del disco.
   */
  deleteById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      // 1. Obtener la información del archivo para eliminar el archivo físico
      const archivoData = await ArchivoEquipoModel.getById(id);
      if (!archivoData) return false;

      // 2. Eliminar el registro de la BD
      await transaction.begin();
      const request = transaction.request();
      request.input("id", sql.Int, id);

      const result = await request.query(
        `DELETE FROM dbo.ArchivosEquipos WHERE Id = @id`
      );

      await transaction.commit();

      // 3. Eliminar el archivo físico después del commit
      const fullPath = path.join(
        archivoData.RutaAlmacenamiento,
        archivoData.NombreArchivo
      );
      await fs.unlink(fullPath);

      return result.rowsAffected[0] > 0;
    } catch (err) {
      console.error(
        "Error en la transacción de ELIMINAR ArchivoEquipo (BD y disco), haciendo rollback...",
        err
      );
      await transaction.rollback();

      // Si el error es al eliminar el archivo físico, el registro de la BD ya se eliminó.
      // Podrías necesitar un manejo de errores más sofisticado aquí (e.g., reintentos o log de archivos huérfanos)
      if (err.code === "ENOENT" || err.code === "EPERM") {
        console.warn(
          `Advertencia: El archivo físico ${fullPath} no existe o no se pudo acceder después de eliminar el registro de BD.`
        );
        // Continuar, ya que el registro de BD se eliminó
        return true;
      }

      throw err;
    }
  },
};
