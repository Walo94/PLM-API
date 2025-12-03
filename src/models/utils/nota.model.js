import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

export const NotaModel = {
  /**
   * Crea una nueva nota
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("usuarioId", sql.SmallInt, data.usuarioId);
    request.input("contenido", sql.NVarChar(sql.MAX), data.contenido);
    // Inicialmente guardamos null o array vacío en imágenes, se actualiza después de mover los archivos
    request.input("imagenes", sql.VarChar(sql.MAX), null);

    // Usamos GETDATE() de SQL para la fecha exacta del servidor
    const result = await request.query(
      `INSERT INTO dbo.Notas 
       (UsuarioId, Contenido, Imagenes, Fecha) 
       OUTPUT INSERTED.Id, INSERTED.Fecha
       VALUES (@usuarioId, @contenido, @imagenes, GETDATE())`
    );

    return {
      id: result.recordset[0].Id,
      fecha: result.recordset[0].Fecha,
      ...data,
    };
  },

  /**
   * Actualiza contenido e imágenes de una nota
   */
  update: async (id, data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("id", sql.Int, id);
    request.input("contenido", sql.NVarChar(sql.MAX), data.contenido);
    request.input("imagenes", sql.VarChar(sql.MAX), data.imagenes); // JSON String

    // Usamos GETDATE() en Fecha si quieres actualizar la fecha de modificación,
    // o déjalo igual si quieres preservar la fecha de creación.
    // Aquí actualizamos la fecha para reflejar la edición.
    await request.query(`
      UPDATE dbo.Notas 
      SET Contenido = @contenido,
          Imagenes = @imagenes,
          Fecha = GETDATE() 
      WHERE Id = @id
    `);

    return { success: true };
  },

  /**
   * Actualiza el campo de imágenes (JSON array) después de subir archivos
   */
  updateImagenes: async (id, imagenesJson) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("id", sql.Int, id);
    request.input("imagenes", sql.VarChar(sql.MAX), imagenesJson);

    await request.query(`
      UPDATE dbo.Notas 
      SET Imagenes = @imagenes 
      WHERE Id = @id
    `);

    return { success: true };
  },

  /**
   * Obtiene todas las notas de un usuario
   */
  getByUsuarioId: async (usuarioId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("usuarioId", sql.SmallInt, usuarioId);

    const result = await request.query(
      `SELECT Id, UsuarioId, Contenido, Imagenes, Fecha
       FROM dbo.Notas
       WHERE UsuarioId = @usuarioId
       ORDER BY Fecha DESC`
    );

    return result.recordset.map((record) => ({
      id: record.Id,
      usuarioId: record.UsuarioId,
      contenido: record.Contenido,
      imagenes: record.Imagenes ? JSON.parse(record.Imagenes) : [],
      fecha: record.Fecha,
    }));
  },

  /**
   * Obtiene una nota por ID (útil para verificar antes de borrar)
   */
  getById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("id", sql.Int, id);

    const result = await request.query(
      `SELECT * FROM dbo.Notas WHERE Id = @id`
    );

    if (result.recordset.length === 0) return null;

    const record = result.recordset[0];
    return {
      id: record.Id,
      usuarioId: record.UsuarioId,
      contenido: record.Contenido,
      imagenes: record.Imagenes ? JSON.parse(record.Imagenes) : [],
      fecha: record.Fecha,
    };
  },

  /**
   * Elimina una nota
   */
  delete: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("id", sql.Int, id);

    await request.query(`DELETE FROM dbo.Notas WHERE Id = @id`);

    return { success: true };
  },
};
