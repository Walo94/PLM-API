import { BloqueoModel } from "../../models/proyectos/bloqueo.model.js";
import { ProyectoModel } from "../../models/proyectos/proyecto.model.js";

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error en el controlador:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      message: err.message || "Ocurrió un error en el servidor.",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

/**
 * Obtiene la lista de bloqueos de un proyecto
 */
export const getBloqueosByProyecto = asyncHandler(async (req, res) => {
  const id = Number(req.params.id); // ID del Proyecto
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

  const bloqueos = await BloqueoModel.getBloqueosByProyecto(id);
  res.status(200).json(bloqueos);
});

/**
 * Registra un bloqueo en una actividad
 */
export const addBloqueo = asyncHandler(async (req, res) => {
  const {
    proyectoActividadId,
    areaId,
    responsableId,
    usuarioReportaId,
    descripcion,
    fechaCompromiso,
  } = req.body;

  // Validación básica
  if (
    !proyectoActividadId ||
    !areaId ||
    !responsableId ||
    !descripcion ||
    !fechaCompromiso
  ) {
    return res
      .status(400)
      .json({ message: "Faltan datos obligatorios para el bloqueo." });
  }

  // 1. Guardar en BD
  const result = await BloqueoModel.addBloqueo(req.body);

  // 2. Emitir evento WebSocket para actualizar tableros en tiempo real
  const io = req.app.get("io");
  if (io) {
    const proyectoId = req.body.proyectoId;

    if (proyectoId) {
      io.to(`proyecto_${proyectoId}`).emit("actividad_actualizada", {
        proyectoId: Number(proyectoId),
        actividadId: Number(proyectoActividadId),
        tipo: "BLOQUEO_REGISTRADO",
        nuevoEstatus: 5, // Estatus Bloqueado
        usuarioEjecutor: usuarioReportaId,
      });

      console.log(
        `🚫 Bloqueo reportado en Proyecto ${proyectoId}, Actividad ${proyectoActividadId}`
      );
    }
  }

  res.status(201).json(result);
});

/**
 * Libera un bloqueo
 */
export const resolveBloqueo = asyncHandler(async (req, res) => {
  const bloqueoId = Number(req.params.bloqueoId);
  const { usuarioId, observaciones } = req.body;

  if (isNaN(bloqueoId) || !usuarioId || !observaciones) {
    return res.status(400).json({ message: "Datos incompletos para liberar" });
  }

  const result = await BloqueoModel.resolveBloqueo({
    bloqueoId,
    usuarioId,
    observaciones,
  });

  // Notificación WebSocket
  const io = req.app.get("io");
  if (io) {
    // Necesitamos el ID del proyecto. Podríamos retornarlo del modelo,
    // o hacer una query rápida, pero por ahora asumimos que el cliente refrescará.
    // Una mejora es retornar el proyectoId en el result del modelo.

    // Si tenemos el proyectoActividadId en result:
    if (result.proyectoActividadId) {
      const actividad = await ProyectoModel.getActividadById(
        result.proyectoActividadId
      );
      if (actividad) {
        io.to(`proyecto_${actividad.proyectoId}`).emit(
          "actividad_actualizada",
          {
            proyectoId: actividad.proyectoId,
            actividadId: result.proyectoActividadId,
            tipo: "BLOQUEO_LIBERADO",
            nuevoEstatus: 2,
            usuarioEjecutor: usuarioId,
          }
        );
      }
    }
  }

  res.status(200).json(result);
});

/**
 * Obtiene los bloqueos asignados a un usuario
 */
export const getBloqueosByUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ message: "ID inválido" });

  const bloqueos = await BloqueoModel.getBloqueosByUser(userId);
  res.status(200).json(bloqueos);
});
