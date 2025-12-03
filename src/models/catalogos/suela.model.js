import { connectDB } from "../../config/dbCPT.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

const _mapData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    suela: dbRecord.Suela,
    descripcion: dbRecord.Descripcion,
  };
};

export const SuelaModel = {
  getSuelas: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection.request().query("SELECT * FROM dbo.Suelas");
    return result.recordset.map(_mapData);
  },
};
