import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

const _mapRutaData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.Id,
    nombre: dbRecord.Nombre,
    descripcion: dbRecord.Descripcion,
    diasTotales: dbRecord.DiasTotales,
    fechaCreacion: dbRecord.FechaCreacion,
    estatus: dbRecord.Estatus,
    detallesCount: dbRecord.DetallesCount || 0,
  };
};

const _mapDetalleData = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.Id,
    rutaId: dbRecord.RutaId,
    orden: dbRecord.Orden,
    procesoId: dbRecord.ProcesoId,
    actividadId: dbRecord.ActividadId,
    entregable: dbRecord.Entregable,
    responsableId: dbRecord.ResponsableId,
    autorizaId: dbRecord.AutorizaId,
    diasHabiles: dbRecord.DiasHabiles,
    dependeDeActividadId: dbRecord.DependeDeActividadId,
    diaInicio: dbRecord.DiaInicio,
    diaFin: dbRecord.DiaFin,
    fechaCreacion: dbRecord.FechaCreacion,
    estatus: dbRecord.Estatus,
  };
};

export const RutaModel = {
  /**
   * Crea una nueva Ruta con su detalle.
   */
  create: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();

      const fechaActual = new Date();
      const fechaMexico = new Date(
        fechaActual.toLocaleString("en-US", { timeZone: "America/Mexico_City" })
      );

      // Insertar encabezado de ruta
      const requestRuta = transaction.request();
      requestRuta.input("nombre", sql.VarChar(100), data.nombre);
      requestRuta.input("descripcion", sql.VarChar(sql.MAX), data.descripcion);
      requestRuta.input("diasTotales", sql.SmallInt, data.diasTotales);
      requestRuta.input("fechaCreacion", sql.DateTime, fechaMexico);
      requestRuta.input("estatus", sql.TinyInt, 1);

      const resultRuta = await requestRuta.query(
        `INSERT INTO dbo.Rutas (Nombre, Descripcion, DiasTotales, FechaCreacion, Estatus) 
         OUTPUT INSERTED.Id
         VALUES (@nombre, @descripcion, @diasTotales, @fechaCreacion, @estatus)`
      );

      const rutaId = resultRuta.recordset[0].Id;

      // Insertar detalle de ruta
      if (data.detalles && data.detalles.length > 0) {
        for (const detalle of data.detalles) {
          const requestDetalle = transaction.request();

          requestDetalle.input("rutaId", sql.SmallInt, rutaId);
          requestDetalle.input("orden", sql.SmallInt, detalle.orden);
          requestDetalle.input("procesoId", sql.SmallInt, detalle.procesoId);
          requestDetalle.input(
            "actividadId",
            sql.SmallInt,
            detalle.actividadId
          );
          requestDetalle.input(
            "entregable",
            sql.VarChar(500),
            detalle.entregable
          );
          requestDetalle.input("responsableId", sql.Int, detalle.responsableId);
          requestDetalle.input("autorizaId", sql.Int, detalle.autorizaId);
          requestDetalle.input(
            "diasHabiles",
            sql.SmallInt,
            detalle.diasHabiles
          );
          requestDetalle.input(
            "dependeDeActividadId",
            sql.SmallInt,
            detalle.dependeDeActividadId || null
          );
          requestDetalle.input("diaInicio", sql.SmallInt, detalle.diaInicio);
          requestDetalle.input("diaFin", sql.SmallInt, detalle.diaFin);
          requestDetalle.input("fechaCreacion", sql.DateTime, fechaMexico);
          requestDetalle.input("estatus", sql.TinyInt, 1);

          await requestDetalle.query(
            `INSERT INTO dbo.RutasDetalle 
             (RutaId, Orden, ProcesoId, ActividadId, Entregable, ResponsableId, 
              AutorizaId, DiasHabiles, DependeDeActividadId, DiaInicio, DiaFin, 
              FechaCreacion, Estatus) 
             VALUES (@rutaId, @orden, @procesoId, @actividadId, @entregable, 
                     @responsableId, @autorizaId, @diasHabiles, @dependeDeActividadId, 
                     @diaInicio, @diaFin, @fechaCreacion, @estatus)`
          );
        }
      }

      await transaction.commit();
      return { ...data, id: rutaId };
    } catch (err) {
      console.error(
        "Error en la transacción de CREAR Ruta, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Actualiza una Ruta por su ID.
   */
  update: async (id, data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();

      // Actualizar encabezado
      const requestRuta = transaction.request();
      requestRuta.input("id", sql.SmallInt, id);
      requestRuta.input("nombre", sql.VarChar(100), data.nombre);
      requestRuta.input("descripcion", sql.VarChar(sql.MAX), data.descripcion);
      requestRuta.input("diasTotales", sql.SmallInt, data.diasTotales);

      await requestRuta.query(
        `UPDATE dbo.Rutas 
         SET Nombre = @nombre, Descripcion = @descripcion, DiasTotales = @diasTotales 
         WHERE Id = @id`
      );

      // Eliminar detalles existentes
      const requestDelete = transaction.request();
      requestDelete.input("rutaId", sql.SmallInt, id);
      await requestDelete.query(
        `DELETE FROM dbo.RutasDetalle WHERE RutaId = @rutaId`
      );

      // Insertar nuevos detalles
      const fechaActual = new Date();
      const fechaMexico = new Date(
        fechaActual.toLocaleString("en-US", { timeZone: "America/Mexico_City" })
      );

      if (data.detalles && data.detalles.length > 0) {
        for (const detalle of data.detalles) {
          const requestDetalle = transaction.request();

          requestDetalle.input("rutaId", sql.SmallInt, id);
          requestDetalle.input("orden", sql.SmallInt, detalle.orden);
          requestDetalle.input("procesoId", sql.SmallInt, detalle.procesoId);
          requestDetalle.input(
            "actividadId",
            sql.SmallInt,
            detalle.actividadId
          );
          requestDetalle.input(
            "entregable",
            sql.VarChar(500),
            detalle.entregable
          );
          requestDetalle.input("responsableId", sql.Int, detalle.responsableId);
          requestDetalle.input("autorizaId", sql.Int, detalle.autorizaId);
          requestDetalle.input(
            "diasHabiles",
            sql.SmallInt,
            detalle.diasHabiles
          );
          requestDetalle.input(
            "dependeDeActividadId",
            sql.SmallInt,
            detalle.dependeDeActividadId || null
          );
          requestDetalle.input("diaInicio", sql.SmallInt, detalle.diaInicio);
          requestDetalle.input("diaFin", sql.SmallInt, detalle.diaFin);
          requestDetalle.input("fechaCreacion", sql.DateTime, fechaMexico);
          requestDetalle.input("estatus", sql.TinyInt, 1);

          await requestDetalle.query(
            `INSERT INTO dbo.RutasDetalle 
             (RutaId, Orden, ProcesoId, ActividadId, Entregable, ResponsableId, 
              AutorizaId, DiasHabiles, DependeDeActividadId, DiaInicio, DiaFin, 
              FechaCreacion, Estatus) 
             VALUES (@rutaId, @orden, @procesoId, @actividadId, @entregable, 
                     @responsableId, @autorizaId, @diasHabiles, @dependeDeActividadId, 
                     @diaInicio, @diaFin, @fechaCreacion, @estatus)`
          );
        }
      }

      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Ruta, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Actualiza el estatus de una Ruta por su ID.
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
        `UPDATE dbo.Rutas SET Estatus = @estatus WHERE Id = @id`
      );

      await transaction.commit();
      return data;
    } catch (err) {
      console.error(
        "Error en la transacción de ACTUALIZAR Estatus Ruta, haciendo rollback...",
        err
      );
      await transaction.rollback();
      throw err;
    }
  },

  /**
   * Obtiene todas las Rutas.
   */
  getAll: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const result = await connection.request().query(
      `SELECT r.*, 
                COUNT(rd.RutaId) AS DetallesCount 
         FROM dbo.Rutas r
         LEFT JOIN dbo.RutasDetalle rd ON r.Id = rd.RutaId
         GROUP BY r.Id, r.Nombre, r.Descripcion, r.DiasTotales, r.FechaCreacion, r.Estatus
         ORDER BY r.Nombre`
    );
    // Usar el nuevo mapeo
    return result.recordset.map(_mapRutaData);
  },
  /**
   * Obtiene una Ruta por su ID con su detalle.
   */
  getById: async (id) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    // Obtener encabezado
    const requestRuta = connection.request();
    requestRuta.input("id", sql.SmallInt, id);
    const resultRuta = await requestRuta.query(
      `SELECT * FROM dbo.Rutas WHERE Id = @id`
    );

    if (resultRuta.recordset.length === 0) return null;

    const ruta = _mapRutaData(resultRuta.recordset[0]);

    // Obtener detalle
    const requestDetalle = connection.request();
    requestDetalle.input("rutaId", sql.SmallInt, id);
    const resultDetalle = await requestDetalle.query(
      `SELECT * FROM dbo.RutasDetalle WHERE RutaId = @rutaId ORDER BY Orden`
    );

    ruta.detalles = resultDetalle.recordset.map(_mapDetalleData);

    return ruta;
  },
};
