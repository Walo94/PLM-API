import { connectDB } from "../../config/db.js";
import sql from "mssql";

const _getDbConfig = () => {
  return { pool: connectDB };
};

export const AtrasosModel = {
  /**
   * Ejecuta el stored procedure para calcular atrasos
   * Retorna las actividades afectadas (con atraso nuevo o incrementado)
   */
  calcularAtrasos: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    try {
      const result = await connection
        .request()
        .execute("SP_CalcularAtrasosProyectos");

      // El SP retorna las actividades con atraso nuevo o incrementado
      return result.recordset || [];
    } catch (error) {
      console.error("Error ejecutando SP_CalcularAtrasosProyectos:", error);
      throw error;
    }
  },

  /**
   * Obtiene información de atrasos de un proyecto específico
   */
  getAtrasosProyecto: async (proyectoId) => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const request = connection.request();
    request.input("proyectoId", sql.Int, proyectoId);

    const query = `
      SELECT 
        p.Id as ProyectoId,
        p.Modelo,
        p.CodigoDDI,
        p.DiasAtraso as DiasAtrasoProyecto,
        p.PorcentajeAvance,
        (
          SELECT COUNT(*) 
          FROM dbo.ProyectosActividades pa 
          WHERE pa.ProyectoId = p.Id 
          AND pa.Estatus = 4  -- Atrasadas
        ) as ActividadesAtrasadas,
        (
          SELECT 
            pa.Id,
            pa.Orden,
            a.Descripcion as ActividadNombre,
            pa.Entregable,
            pa.DiasAtraso,
            pa.FechaFinCalculada,
            u1.Usuario as ResponsableNombre,
            u2.Usuario as AutorizaNombre,
            pa.ResponsableId,
            pa.AutorizaId
          FROM dbo.ProyectosActividades pa
          LEFT JOIN dbo.Actividades a ON pa.ActividadId = a.Id
          LEFT JOIN dbo.Usuarios u1 ON pa.ResponsableId = u1.Id
          LEFT JOIN dbo.Usuarios u2 ON pa.AutorizaId = u2.Id
          WHERE pa.ProyectoId = p.Id
          AND pa.Estatus IN (2, 4, 5)  -- En Proceso, Atrasada o Bloqueada
          AND pa.DiasAtraso > 0
          ORDER BY pa.DiasAtraso DESC
          FOR JSON PATH
        ) as ActividadesDetalleJson
      FROM dbo.Proyectos p
      WHERE p.Id = @proyectoId
      AND p.Estatus = 1
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return null;
    }

    const proyecto = result.recordset[0];

    return {
      proyectoId: proyecto.ProyectoId,
      modelo: proyecto.Modelo,
      codigoDDI: proyecto.CodigoDDI,
      diasAtrasoProyecto: proyecto.DiasAtrasoProyecto,
      porcentajeAvance: proyecto.PorcentajeAvance,
      actividadesAtrasadas: proyecto.ActividadesAtrasadas,
      actividadesDetalle: proyecto.ActividadesDetalleJson
        ? JSON.parse(proyecto.ActividadesDetalleJson)
        : [],
    };
  },

  /**
   * Obtiene resumen global de atrasos de todos los proyectos activos
   */
  getAtrasosGlobales: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const query = `
      SELECT 
        COUNT(DISTINCT p.Id) as TotalProyectosActivos,
        COUNT(DISTINCT CASE WHEN p.DiasAtraso > 0 THEN p.Id END) as ProyectosConAtraso,
        SUM(p.DiasAtraso) as TotalDiasAtrasoProyectos,
        COUNT(CASE WHEN pa.Estatus = 4 THEN 1 END) as TotalActividadesAtrasadas,
        SUM(CASE WHEN pa.Estatus = 4 THEN pa.DiasAtraso ELSE 0 END) as TotalDiasAtrasoActividades,
        AVG(CASE WHEN p.DiasAtraso > 0 THEN CAST(p.DiasAtraso AS FLOAT) END) as PromedioAtrasoProyectos
      FROM dbo.Proyectos p
      LEFT JOIN dbo.ProyectosActividades pa ON p.Id = pa.ProyectoId
      WHERE p.Estatus = 1  -- Solo proyectos activos
    `;

    const result = await connection.request().query(query);

    return {
      totalProyectosActivos: result.recordset[0].TotalProyectosActivos,
      proyectosConAtraso: result.recordset[0].ProyectosConAtraso,
      totalDiasAtrasoProyectos:
        result.recordset[0].TotalDiasAtrasoProyectos || 0,
      totalActividadesAtrasadas:
        result.recordset[0].TotalActividadesAtrasadas || 0,
      totalDiasAtrasoActividades:
        result.recordset[0].TotalDiasAtrasoActividades || 0,
      promedioAtrasoProyectos: result.recordset[0].PromedioAtrasoProyectos
        ? parseFloat(result.recordset[0].PromedioAtrasoProyectos.toFixed(2))
        : 0,
    };
  },

  /**
   * Obtiene todas las actividades atrasadas del sistema
   */
  getActividadesAtrasadas: async () => {
    const { pool } = _getDbConfig();
    const connection = await pool();

    const query = `
      SELECT 
        pa.Id as ActividadId,
        pa.ProyectoId,
        p.Modelo,
        p.CodigoDDI,
        pa.Orden,
        a.Descripcion as ActividadNombre,
        pa.Entregable,
        pa.DiasAtraso,
        pa.FechaFinCalculada,
        pa.Estatus,
        u1.Usuario as ResponsableNombre,
        u2.Usuario as AutorizaNombre,
        pa.ResponsableId,
        pa.AutorizaId
      FROM dbo.ProyectosActividades pa
      INNER JOIN dbo.Proyectos p ON pa.ProyectoId = p.Id
      LEFT JOIN dbo.Actividades a ON pa.ActividadId = a.Id
      LEFT JOIN dbo.Usuarios u1 ON pa.ResponsableId = u1.Id
      LEFT JOIN dbo.Usuarios u2 ON pa.AutorizaId = u2.Id
      WHERE p.Estatus = 1  -- Solo proyectos activos
      AND pa.Estatus IN (1, 2, 4, 5)  -- En Proceso, Atrasada o Bloqueada
      AND pa.DiasAtraso > 0
      ORDER BY pa.DiasAtraso DESC, p.Modelo
    `;

    const result = await connection.request().query(query);

    return result.recordset.map((row) => ({
      actividadId: row.ActividadId,
      proyectoId: row.ProyectoId,
      modelo: row.Modelo,
      codigoDDI: row.CodigoDDI,
      orden: row.Orden,
      actividadNombre: row.ActividadNombre,
      entregable: row.Entregable,
      diasAtraso: row.DiasAtraso,
      fechaFinCalculada: row.FechaFinCalculada,
      estatus: row.Estatus,
      responsableNombre: row.ResponsableNombre,
      autorizaNombre: row.AutorizaNombre,
      responsableId: row.ResponsableId,
      autorizaId: row.AutorizaId,
    }));
  },
};
