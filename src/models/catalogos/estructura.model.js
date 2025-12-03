import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

const _mapData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.Id,
    descripcion: dbRecord.Descripcion,
    estatus: dbRecord.Estatus,
  };
};

export const EstructuraModel = {
  /**
   * Crea una nueva estructura.
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();
    try {
      await transaction.begin();
      const request = transaction.request();

      request.input("descripcion", sql.VarChar(150), data.descripcion);
      request.input("estatus", sql.TinyInt, 1);

      await request.query(
        `INSERT INTO dbo.Estructuras (Descripcion, Estatus) VALUES (@descripcion, @estatus)`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de CREAR Estructura, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Actualiza una estructura por su ID.
   */
  update: async (id, data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();
    try {
      await transaction.begin();
      const request = transaction.request();

      request.input("id", sql.SmallInt, id);
      request.input("descripcion", sql.VarChar(150), data.descripcion);

      await request.query(
        `UPDATE dbo.Estructuras SET Descripcion = @descripcion WHERE Id = @id`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Estructura, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Actualiza el estatus de una estructura por su ID.
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
        `UPDATE dbo.Estructuras SET Estatus = @estatus WHERE Id = @id`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Estatus Estructura, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene todas las estructuras.
   */
  getAll: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection
      .request()
      .query(`SELECT * FROM dbo.Estructuras ORDER BY Descripcion`);
    return result.recordset.map(_mapData);
  },
};
