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
    password: dbRecord.Password,
    permisos: dbRecord.Permisos,
    estatus: dbRecord.Estatus,
  };
};

export const AuthModel = {
  /**
   * Autentica un usuario con sus credenciales
   */
  authenticate: async (usuario, password) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    try {
      const request = connection.request();
      request.input("usuario", sql.VarChar(100), usuario);
      request.input("password", sql.VarChar(50), password);

      const result = await request.query(
        `SELECT p.Id, p.Usuario, ps.Id as PuestoId, ps.Descripcion AS PuestoNombre, p.Password, p.Permisos, p.Estatus FROM dbo.Usuarios p
INNER JOIN Puestos ps ON p.Puesto = ps.Id
         WHERE p.Usuario = @usuario AND p.Password = @password`
      );

      if (result.recordset.length === 0) {
        return null;
      }

      return _mapData(result.recordset[0]);
    } catch (err) {
      console.error("Error al autenticar usuario:", err);
      throw err;
    }
  },

  /**
   * Obtiene un usuario por su ID
   */
  getUserById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    try {
      const request = connection.request();
      request.input("id", sql.SmallInt, id);

      const result = await request.query(
        `SELECT p.Id, p.Usuario, ps.Id as PuestoId, ps.Descripcion AS PuestoNombre, p.Password, p.Permisos, p.Estatus FROM dbo.Usuarios p
INNER JOIN Puestos ps ON p.Puesto = ps.Id
         WHERE p.Id = @id`
      );

      if (result.recordset.length === 0) {
        return null;
      }

      return _mapData(result.recordset[0]);
    } catch (err) {
      console.error("Error al obtener usuario por ID:", err);
      throw err;
    }
  },
};
