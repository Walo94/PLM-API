import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

const _mapDiaNoLaborableData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.Id,
    fecha: dbRecord.Fecha,
    descripcion: dbRecord.Descripcion,
  };
};

export const DiaNoLaborableModel = {
  /**
   * Crea un nuevo día no laborable
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const request = connection.request();

    request.input("fecha", sql.Date, data.fecha);
    request.input("descripcion", sql.VarChar(100), data.descripcion);

    const result = await request.query(
      `INSERT INTO dbo.DiasNoLaborables (Fecha, Descripcion) 
       OUTPUT INSERTED.Id
       VALUES (@fecha, @descripcion)`
    );

    return { ...data, id: result.recordset[0].Id };
  },

  /**
   * Obtiene todos los días no laborables
   */
  getAll: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const result = await connection
      .request()
      .query(`SELECT * FROM dbo.DiasNoLaborables ORDER BY Fecha DESC`);

    return result.recordset.map(_mapDiaNoLaborableData);
  },

  /**
   * Obtiene un día no laborable por ID
   */
  getById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const request = connection.request();

    request.input("id", sql.Int, id);

    const result = await request.query(
      `SELECT * FROM dbo.DiasNoLaborables WHERE Id = @id`
    );

    if (result.recordset.length === 0) return null;
    return _mapDiaNoLaborableData(result.recordset[0]);
  },

  /**
   * Actualiza un día no laborable
   */
  update: async (id, data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const request = connection.request();

    request.input("id", sql.Int, id);
    request.input("fecha", sql.Date, data.fecha);
    request.input("descripcion", sql.VarChar(100), data.descripcion);

    await request.query(
      `UPDATE dbo.DiasNoLaborables 
       SET Fecha = @fecha, Descripcion = @descripcion 
       WHERE Id = @id`
    );

    return data;
  },

  /**
   * Elimina un día no laborable
   */
  delete: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const request = connection.request();

    request.input("id", sql.Int, id);

    await request.query(`DELETE FROM dbo.DiasNoLaborables WHERE Id = @id`);

    return { success: true };
  },
};
