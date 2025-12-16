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

  /**
   * Cambia la contraseña de un usuario
   */
  changePassword: async (userId, currentPassword, newPassword) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    try {
      // 1. Verificar que la contraseña actual sea correcta
      const requestVerify = connection.request();
      requestVerify.input("userId", sql.SmallInt, userId);
      requestVerify.input("currentPassword", sql.VarChar(50), currentPassword);

      const verifyResult = await requestVerify.query(
        `SELECT Id FROM dbo.Usuarios 
       WHERE Id = @userId AND Password = @currentPassword AND Estatus = 1`
      );

      if (verifyResult.recordset.length === 0) {
        throw new Error("La contraseña actual es incorrecta");
      }

      // 2. Actualizar la contraseña
      const requestUpdate = connection.request();
      requestUpdate.input("userId", sql.SmallInt, userId);
      requestUpdate.input("newPassword", sql.VarChar(50), newPassword);

      await requestUpdate.query(
        `UPDATE dbo.Usuarios 
       SET Password = @newPassword 
       WHERE Id = @userId`
      );

      return { success: true };
    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      throw err;
    }
  },
};
