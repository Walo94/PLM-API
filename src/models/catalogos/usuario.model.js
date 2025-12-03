import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

const _mapData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.Id,
    usuario: dbRecord.Usuario,
    puestoId: dbRecord.PuestoId,
    puestoNombre: dbRecord.PuestoNombre,
    permisos: dbRecord.Permisos,
    estatus: dbRecord.Estatus,
  };
};

export const UsuarioModel = {
  /**
   * Crea un nuevo usuario.
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();
    try {
      await transaction.begin();
      const request = transaction.request();

      request.input("usuario", sql.VarChar(100), data.usuario);
      request.input("password", sql.VarChar(50), data.password);
      request.input("puestoId", sql.SmallInt, data.puestoId);
      request.input("permisos", sql.VarChar(sql.MAX), data.permisos);
      request.input("estatus", sql.TinyInt, 1);

      await request.query(
        `INSERT INTO dbo.Usuarios (Usuario, Password, Puesto, Permisos, Estatus) VALUES (@usuario, @password, @puestoId, @permisos, @estatus)`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de CREAR Usuario, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Actualiza un Usuario por su ID.
   */
  update: async (id, data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();
      const request = transaction.request();

      // 1. Agregamos los parámetros fijos (obligatorios)
      request.input("id", sql.SmallInt, id);
      request.input("usuario", sql.VarChar(100), data.usuario);
      request.input("puestoId", sql.SmallInt, data.puestoId);
      request.input("permisos", sql.VarChar(sql.MAX), data.permisos);

      // 2. Definimos la base de la consulta SQL
      let query = `UPDATE dbo.Usuarios SET Usuario = @usuario, Puesto = @puestoId, Permisos = @permisos`;

      // 3. Validación Lógica: Si hay password, lo agregamos a la query y a los inputs
      if (data.password && data.password.trim() !== "") {
        query += `, Password = @password`; // Nota la coma al inicio
        request.input("password", sql.VarChar(50), data.password);
      }

      // 4. Cerramos la consulta con el WHERE
      query += ` WHERE Id = @id`;

      // 5. Ejecutamos la consulta dinámica
      await request.query(query);

      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Usuarios, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   *
   * Actualiza el estatus de un Usuario por su ID.
   */
  updateStatus: async (id, data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();
    try {
      await transaction.begin();
      const request = transaction.request();

      request.input("id", sql.SmallInt, id);
      request.input("estatus", sql.TinyInt, data.estatus);

      await request.query(
        `UPDATE dbo.Usuarios SET Estatus = @estatus WHERE Id = @id`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Estatus Persona, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene todas los Usuarios.
   */
  getAll: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection.request()
      .query(`SELECT p.Id, p.Usuario, ps.Id as PuestoId, ps.Descripcion AS PuestoNombre, p.Password, p.Permisos, p.Estatus FROM dbo.Usuarios p
INNER JOIN Puestos ps ON p.Puesto = ps.Id ORDER BY p.Usuario`);
    return result.recordset.map(_mapData);
  },
};
