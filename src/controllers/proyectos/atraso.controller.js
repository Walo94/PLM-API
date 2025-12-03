import { AtrasosModel } from "../../models/proyectos/atraso.model.js";
import { ProyectoModel } from "../../models/proyectos/proyecto.model.js";
import { NotificacionModel } from "../../models/utils/notificaciones.model.js";

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error en controlador de atrasos:", err);
    res.status(500).json({ message: err.message });
  });

/**
 * Obtiene información de atrasos de un proyecto específico
 */
export const getAtrasosProyecto = asyncHandler(async (req, res) => {
  const proyectoId = Number(req.params.proyectoId);

  if (isNaN(proyectoId)) {
    return res.status(400).json({ message: "ID de proyecto inválido" });
  }

  const atrasos = await AtrasosModel.getAtrasosProyecto(proyectoId);
  res.status(200).json(atrasos);
});

/**
 * Obtiene resumen global de atrasos de todos los proyectos activos
 */
export const getAtrasosGlobales = asyncHandler(async (req, res) => {
  const atrasos = await AtrasosModel.getAtrasosGlobales();
  res.status(200).json(atrasos);
});

/**
 * Obtiene todas las actividades atrasadas del sistema
 */
export const getActividadesAtrasadas = asyncHandler(async (req, res) => {
  const actividades = await AtrasosModel.getActividadesAtrasadas();
  res.status(200).json(actividades);
});

/**
 * Ejecuta el cálculo de atrasos manualmente y envía notificaciones
 */
export const calcularAtrasosManual = asyncHandler(async (req, res) => {
  console.log("🔄 Iniciando cálculo manual de atrasos...");

  // Ejecutar stored procedure
  const actividadesAfectadas = await AtrasosModel.calcularAtrasos();

  console.log(`📊 Actividades con atrasos: ${actividadesAfectadas.length}`);

  // Enviar notificaciones para actividades con atrasos nuevos o incrementados
  const io = req.app.get("io");

  if (actividadesAfectadas.length > 0) {
    // Agrupar actividades por proyecto para enviar notificaciones
    const proyectosAfectados = new Map();

    for (const actividad of actividadesAfectadas) {
      if (!proyectosAfectados.has(actividad.ProyectoId)) {
        proyectosAfectados.set(actividad.ProyectoId, []);
      }
      proyectosAfectados.get(actividad.ProyectoId).push(actividad);
    }

    // Enviar notificaciones por cada proyecto
    for (const [proyectoId, actividades] of proyectosAfectados) {
      try {
        // Obtener información del proyecto
        const proyecto = await ProyectoModel.getById(proyectoId);
        const proyectoNombre =
          proyecto.modelo || proyecto.codigoDDI || `#${proyectoId}`;

        // Obtener todos los usuarios del proyecto
        const usuariosProyecto = await ProyectoModel.getUsuariosProyecto(
          proyectoId
        );

        if (usuariosProyecto.length === 0) continue;

        // Crear mensaje de notificación
        const cantidadActividades = actividades.length;
        const diasTotales = actividades.reduce(
          (sum, act) => sum + act.DiasAtraso,
          0
        );

        let contenido;
        if (cantidadActividades === 1) {
          const act = actividades[0];
          contenido = `⚠️ La actividad "${act.ActividadNombre}" del Proyecto ${proyectoNombre} tiene ${act.DiasAtraso} día(s) de atraso`;
        } else {
          contenido = `⚠️ El Proyecto ${proyectoNombre} tiene ${cantidadActividades} actividades atrasadas con un total de ${diasTotales} días de atraso acumulado`;
        }

        const proyectoUrl = `${
          process.env.FRONTEND_URL || "http://localhost:8080"
        }/proyectos/avance/${proyectoId}`;

        // Crear notificaciones para todos los usuarios del proyecto
        await NotificacionModel.createMasiva({
          usuariosIds: usuariosProyecto,
          contenido: contenido,
          url: proyectoUrl,
          rutaId: proyecto.rutaId,
        });

        // Emitir evento WebSocket para actualización en tiempo real
        if (io) {
          // Emitir a cada usuario del proyecto
          usuariosProyecto.forEach((usuarioId) => {
            io.to(`usuario_${usuarioId}`).emit("atraso_proyecto", {
              proyectoId: proyectoId,
              proyectoNombre: proyectoNombre,
              actividadesAtrasadas: actividades.map((a) => ({
                id: a.ActividadId,
                nombre: a.ActividadNombre,
                diasAtraso: a.DiasAtraso,
              })),
              diasTotales: diasTotales,
              mensaje: contenido,
            });
          });

          // También emitir al room del proyecto
          io.to(`proyecto_${proyectoId}`).emit("actividad_actualizada", {
            proyectoId: proyectoId,
            tipo: "ATRASO_ACTUALIZADO",
            actividadesAfectadas: actividades.length,
            diasTotales: diasTotales,
          });
        }

        console.log(`✅ Notificaciones enviadas para proyecto ${proyectoId}`);
      } catch (error) {
        console.error(
          `❌ Error enviando notificaciones para proyecto ${proyectoId}:`,
          error
        );
      }
    }
  }

  res.status(200).json({
    message: "Cálculo de atrasos completado",
    actividadesAfectadas: actividadesAfectadas.length,
    proyectosAfectados: new Set(actividadesAfectadas.map((a) => a.ProyectoId))
      .size,
    detalles: actividadesAfectadas,
  });
});
