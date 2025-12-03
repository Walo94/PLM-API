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
    color: dbRecord.Color, // Nuevo campo
    estatus: dbRecord.Estatus,
  };
};

export const PrioridadModel = {
  /**
   * Crea una nueva prioridad.
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();
    try {
      await transaction.begin();
      const request = transaction.request();

      // Ajustado a VarChar(20) según requerimiento
      request.input("descripcion", sql.VarChar(20), data.descripcion);
      request.input("color", sql.VarChar(20), data.color);
      request.input("estatus", sql.TinyInt, 1);

      await request.query(
        `INSERT INTO dbo.Prioridades (Descripcion, Color, Estatus) VALUES (@descripcion, @color, @estatus)`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de CREAR Prioridad, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Actualiza una prioridad por su ID.
   */
  update: async (id, data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();
    try {
      await transaction.begin();
      const request = transaction.request();

      request.input("id", sql.SmallInt, id);
      request.input("descripcion", sql.VarChar(20), data.descripcion);
      request.input("color", sql.VarChar(20), data.color);

      await request.query(
        `UPDATE dbo.Prioridades SET Descripcion = @descripcion, Color = @color WHERE Id = @id`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Prioridad, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Actualiza el estatus de una prioridad por su ID.
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
        `UPDATE dbo.Prioridades SET Estatus = @estatus WHERE Id = @id`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Estatus Prioridad, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene todas las prioridades.
   */
  getAll: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection
      .request()
      .query(`SELECT * FROM dbo.Prioridades ORDER BY Descripcion`);
    return result.recordset.map(_mapData);
  },
};
