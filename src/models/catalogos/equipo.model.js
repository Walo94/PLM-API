import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

const _mapData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.Id,
    nombre: dbRecord.Nombre,
    fechaCreacion: dbRecord.FechaCreacion,
    personas: dbRecord.Personas,
    estatus: dbRecord.Estatus,
  };
};

export const EquipoModel = {
  /**
   * Crea un nuevo Equipo.
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

      request.input("nombre", sql.VarChar(100), data.nombre);
      request.input("personas", sql.VarChar(sql.MAX), data.personas);
      request.input("fechaCreacion", sql.DateTime, fechaMexico);
      request.input("estatus", sql.TinyInt, 1);

      await request.query(
        `INSERT INTO dbo.Equipos (Nombre, Personas, FechaCreacion, Estatus) 
             VALUES (@nombre, @personas, @fechaCreacion, @estatus)`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de CREAR Equipo, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Actualiza un Equipo por su ID.
   */
  update: async (id, data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();
      const request = transaction.request();

      request.input("id", sql.SmallInt, id);
      request.input("nombre", sql.VarChar(100), data.nombre);
      request.input("personas", sql.VarChar(sql.MAX), data.personas);

      await request.query(
        `UPDATE dbo.Equipos SET Nombre = @nombre, Personas = @personas WHERE Id = @id`
      );

      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Equipos, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   *
   * Actualiza el estatus de un Equipo por su ID.
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
        `UPDATE dbo.Equipos SET Estatus = @estatus WHERE Id = @id`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Estatus Equipo, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene todas los Equipos.
   */
  getAll: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection
      .request()
      .query(`SELECT * FROM dbo.Equipos ORDER BY Nombre`);
    return result.recordset.map(_mapData);
  },

  getByTeam: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const request = connection.request();
    request.input("id", sql.SmallInt, id);

    const result = await request.query(`SELECT Id, Nombre FROM dbo.Equipos
WHERE Estatus = 1
  AND EXISTS (
      SELECT 1
      FROM OPENJSON([Personas])
      WITH (id int '$.id')
      WHERE id = @id
  );`);
    return result.recordset.map(_mapData);
  },

  getById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection
      .request()
      .input("id", sql.SmallInt, id)
      .query(
        `SELECT Id, Nombre, Personas, Estatus FROM dbo.Equipos WHERE Id = @id`
      );

    return result.recordset.length > 0 ? _mapData(result.recordset[0]) : null;
  },
};
