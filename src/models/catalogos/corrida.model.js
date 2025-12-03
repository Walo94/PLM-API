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
    puntoInicial: dbRecord.PuntoInicial,
    puntoFinal: dbRecord.PuntoFinal,
    estatus: dbRecord.Estatus,
  };
};

export const CorridaModel = {
  /**
   * Crea una nueva corrida (ID Manual).
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();
    try {
      await transaction.begin();
      const request = transaction.request();

      // ID manual (SmallInt)
      request.input("id", sql.SmallInt, data.id);
      request.input("descripcion", sql.VarChar(20), data.descripcion);
      request.input("puntoInicial", sql.TinyInt, data.puntoInicial);
      request.input("puntoFinal", sql.TinyInt, data.puntoFinal);
      request.input("estatus", sql.TinyInt, 1); // Estatus activo por defecto

      await request.query(`
                INSERT INTO dbo.Corridas (Id, Descripcion, PuntoInicial, PuntoFinal, Estatus) 
                VALUES (@id, @descripcion, @puntoInicial, @puntoFinal, @estatus)
            `);

      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de CREAR Corrida, haciendo rollback...",
        err
      );
      await transaction.rollback();
      // Es útil saber si el error fue por llave duplicada (Error 2627)
      if (err.number === 2627) {
        throw new Error("El ID de la corrida ya existe.");
      }
      throw err;
    }
  },

  /**
   * Actualiza una corrida por su ID.
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
      request.input("puntoInicial", sql.TinyInt, data.puntoInicial);
      request.input("puntoFinal", sql.TinyInt, data.puntoFinal);

      await request.query(`
                UPDATE dbo.Corridas 
                SET Descripcion = @descripcion, 
                    PuntoInicial = @puntoInicial, 
                    PuntoFinal = @puntoFinal 
                WHERE Id = @id
            `);

      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Corrida, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Actualiza el estatus de una corrida por su ID.
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
        `UPDATE dbo.Corridas SET Estatus = @estatus WHERE Id = @id`
      );
      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Estatus Corrida, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene todas las corridas.
   */
  getAll: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection
      .request()
      .query(`SELECT * FROM dbo.Corridas ORDER BY Id`);
    return result.recordset.map(_mapData);
  },
};
