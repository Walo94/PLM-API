import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

export const BloqueoModel = {
  /**
   * Registrar un bloqueo
   */
  addBloqueo: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();

      // 1. Insertar bloqueo en tabla específica
      const reqBloqueo = transaction.request();
      reqBloqueo.input(
        "proyectoActividadId",
        sql.Int,
        data.proyectoActividadId
      );
      reqBloqueo.input("areaId", sql.SmallInt, data.areaId);
      reqBloqueo.input("responsableId", sql.SmallInt, data.responsableId);
      reqBloqueo.input("usuarioReportaId", sql.SmallInt, data.usuarioReportaId);
      reqBloqueo.input("descripcion", sql.NVarChar(sql.MAX), data.descripcion);
      reqBloqueo.input(
        "accionCorrectiva",
        sql.NVarChar(sql.MAX),
        data.accionCorrectiva
      );
      reqBloqueo.input("fechaCompromiso", sql.Date, data.fechaCompromiso);

      await reqBloqueo.query(`
       INSERT INTO dbo.ProyectosActividadesBloqueos
       (ProyectoActividadId, AreaId, ResponsableId, UsuarioReportaId, Descripcion, AccionCorrectiva, FechaCompromiso, FechaInicio, Estatus)
       VALUES (@proyectoActividadId, @areaId, @responsableId, @usuarioReportaId, @descripcion, @accionCorrectiva, @fechaCompromiso, GETDATE(), 1)
     `);

      // 2. Obtener el estatus anterior para la bitácora (Opcional, asumimos que estaba En Proceso = 2)
      // Para ser precisos, podríamos consultarlo, pero por rendimiento asumiremos que si se bloquea es porque estaba activa.

      // 3. Actualizar estatus de actividad a 5 (Bloqueada)
      const reqUpdate = transaction.request();
      reqUpdate.input("id", sql.Int, data.proyectoActividadId);
      await reqUpdate.query(
        `UPDATE dbo.ProyectosActividades SET Estatus = 5 WHERE Id = @id`
      );

      // 4. NUEVO: Insertar registro en la Bitácora
      const reqBitacora = transaction.request();
      reqBitacora.input(
        "proyectoActividadId",
        sql.Int,
        data.proyectoActividadId
      );
      reqBitacora.input("usuarioId", sql.SmallInt, data.usuarioReportaId);
      // Asumimos que venía de EnProceso (2) -> Bloqueada (5)
      reqBitacora.input("estatusAnterior", sql.TinyInt, 2);
      reqBitacora.input("estatusNuevo", sql.TinyInt, 5);
      reqBitacora.input(
        "comentario",
        sql.NVarChar(sql.MAX),
        `BLOQUEO REPORTADO: ${data.descripcion}`
      );

      await reqBitacora.query(`
       INSERT INTO dbo.ProyectosActividadesBitacora 
       (ProyectoActividadId, UsuarioId, EstatusAnterior, EstatusNuevo, Comentario, FechaRegistro)
       VALUES (@proyectoActividadId, @usuarioId, @estatusAnterior, @estatusNuevo, @comentario, GETDATE())
     `);

      await transaction.commit();
      return { success: true };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Obtiene todos los bloqueos registrados en un proyecto (Activos e Históricos)
   */
  getBloqueosByProyecto: async (proyectoId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("proyectoId", sql.Int, proyectoId);

    // Hacemos JOIN con Actividades para filtrar por Proyecto
    // Y JOIN con Procesos/Usuarios para tener nombres legibles
    const result = await request.query(`
        SELECT 
          b.Id,
          b.ProyectoActividadId,
          pa.ActividadNombre,
          pa.Entregable,
          b.AreaId,
          proc.Descripcion as AreaNombre,
          b.ResponsableId,
          uResp.Usuario as ResponsableNombre,
          b.UsuarioReportaId,
          uRep.Usuario as UsuarioReportaNombre,
          b.Descripcion,
          b.AccionCorrectiva,
          b.FechaInicio,
          b.FechaCompromiso,
          b.FechaLiberacion,
          b.Observaciones,
          b.Estatus -- 1: Activo, 0: Resuelto
        FROM dbo.ProyectosActividadesBloqueos b
        INNER JOIN dbo.ProyectosActividades pa ON b.ProyectoActividadId = pa.Id
        LEFT JOIN dbo.Procesos proc ON b.AreaId = proc.Id
        LEFT JOIN dbo.Usuarios uResp ON b.ResponsableId = uResp.Id
        LEFT JOIN dbo.Usuarios uRep ON b.UsuarioReportaId = uRep.Id
        WHERE pa.ProyectoId = @proyectoId
        ORDER BY b.Estatus DESC, b.FechaInicio DESC
      `);

    return result.recordset;
  },

  /**
   * Obtiene los bloqueos asignados a un usuario (donde es responsable)
   */
  getBloqueosByUser: async (userId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("userId", sql.SmallInt, userId);

    const result = await request.query(`
        SELECT 
          b.Id as id,
          b.ProyectoActividadId as proyectoActividadId,
          pa.ProyectoId as proyectoId,
          p.Modelo as proyectoModelo,
          p.CodigoDDI as codigoDDI,
          ac.Descripcion as actividadNombre,
          pa.Entregable as entregable,
          b.AreaId as areaId,
          pro.Descripcion as areaNombre,
          b.ResponsableId as responsableId,
          uResp.Usuario as responsableNombre,
          b.UsuarioReportaId as usuarioReportaId,
          uRep.Usuario as usuarioReportaNombre,
          b.Descripcion as descripcion,
          b.AccionCorrectiva as accionCorrectiva,
          b.FechaInicio as fechaInicio,
          b.FechaCompromiso as fechaCompromiso,
          b.FechaLiberacion as fechaLiberacion,
          b.Observaciones as observaciones,
          b.Estatus as estatus
        FROM dbo.ProyectosActividadesBloqueos b
        INNER JOIN dbo.ProyectosActividades pa ON b.ProyectoActividadId = pa.Id
        INNER JOIN dbo.Proyectos p ON pa.ProyectoId = p.Id
        LEFT JOIN dbo.Procesos pro ON b.AreaId = pro.Id
        LEFT JOIN dbo.Actividades ac ON pa.ActividadId = ac.Id
        LEFT JOIN dbo.Usuarios uResp ON b.ResponsableId = uResp.Id
        LEFT JOIN dbo.Usuarios uRep ON b.UsuarioReportaId = uRep.Id
        WHERE b.ResponsableId = @userId
        ORDER BY b.Estatus DESC, b.FechaCompromiso ASC
      `);

    return result.recordset;
  },

  /**
   * Resuelve (libera) un bloqueo y reactiva la actividad
   */
  resolveBloqueo: async (data) => {
    const { pool } = _getDbConfig();
    const connection = await pool();
    const transaction = connection.transaction();

    try {
      await transaction.begin();

      // 1. Marcar bloqueo como resuelto
      const reqBloqueo = transaction.request();
      reqBloqueo.input("id", sql.Int, data.bloqueoId);
      reqBloqueo.input(
        "observaciones",
        sql.VarChar(sql.MAX),
        data.observaciones
      );

      // Obtenemos info del bloqueo para saber qué actividad reactivar
      const bloqueoResult = await reqBloqueo.query(`
          UPDATE dbo.ProyectosActividadesBloqueos
          SET Estatus = 0, FechaLiberacion = GETDATE(), Observaciones = @observaciones
          OUTPUT DELETED.ProyectoActividadId, DELETED.ResponsableId
          WHERE Id = @id
        `);

      if (bloqueoResult.recordset.length === 0) {
        throw new Error("Bloqueo no encontrado");
      }

      const proyectoActividadId =
        bloqueoResult.recordset[0].ProyectoActividadId;

      // 2. Reactivar la actividad (Pasar de Bloqueada (5) a En Proceso (2))
      const reqActividad = transaction.request();
      reqActividad.input("id", sql.Int, proyectoActividadId);

      await reqActividad.query(`
          UPDATE dbo.ProyectosActividades 
          SET Estatus = 2 -- Regresa a En Proceso
          WHERE Id = @id AND Estatus = 5 -- Solo si estaba bloqueada
        `);

      // 3. Registrar liberación en Bitácora
      const reqBitacora = transaction.request();
      reqBitacora.input("proyectoActividadId", sql.Int, proyectoActividadId);
      reqBitacora.input("usuarioId", sql.SmallInt, data.usuarioId);
      reqBitacora.input(
        "comentario",
        sql.VarChar(sql.MAX),
        `BLOQUEO LIBERADO: ${data.observaciones}`
      );

      await reqBitacora.query(`
          INSERT INTO dbo.ProyectosActividadesBitacora 
          (ProyectoActividadId, UsuarioId, EstatusAnterior, EstatusNuevo, Comentario, FechaRegistro)
          VALUES (@proyectoActividadId, @usuarioId, 5, 2, @comentario, GETDATE())
        `);

      await transaction.commit();

      // Retornar ID de actividad para notificaciones
      return {
        success: true,
        proyectoActividadId,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
