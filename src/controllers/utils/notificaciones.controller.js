import { NotificacionModel } from "../../models/utils/notificaciones.model.js";

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error notificaciones:", err);
    res.status(500).json({ message: err.message });
  });

/**
 * Crea notificaciones. Detecta automáticamente el tipo de envío:
 * 1. Si viene 'usuariosIds' (array) -> Masivo.
 * 2. Si viene 'equipoId' -> Grupal.
 * 3. Si viene 'personaId' -> Individual.
 */
export const createNotificacion = asyncHandler(async (req, res) => {
  const { usuarioId, equipoId, usuariosIds, contenido, url, rutaId, senderId } =
    req.body;

  if (!contenido) {
    return res.status(400).json({ message: "El contenido es requerido." });
  }

  const io = req.app.get("io");
  let resultado;
  let tipoEnvio = "";

  // --- CASO 1: MASIVO MANUAL ---
  if (usuariosIds && Array.isArray(usuariosIds) && usuariosIds.length > 0) {
    tipoEnvio = "MASIVO";
    const idsFinales = senderId
      ? usuariosIds.filter((id) => id !== senderId)
      : usuariosIds;

    resultado = await NotificacionModel.createMasiva({
      usuariosIds: idsFinales,
      contenido,
      url,
      rutaId,
      equipoId: null,
    });

    if (io) {
      // Iteramos sobre los datos insertados { id, usuarioId }
      resultado.datos.forEach((item) => {
        io.to(`usuario_${item.usuarioId}`).emit("nueva_notificacion", {
          // IMPORTANTE: Usar PascalCase (Mayúsculas) como en la BD
          id: item.id,
          Contenido: contenido,
          Fecha: new Date(), // O usar fecha del servidor si la retornas
          Leida: "N",
          URL: url,
          EquipoId: 0,
          RutaId: rutaId || 0,
          NombreEquipo: "", // Opcional: podrías pasarlo si lo tienes
          NombrePersona: "",
        });
      });
    }

    // --- CASO 2: GRUPAL (EXPLODED) ---
  } else if (equipoId) {
    tipoEnvio = "GRUPAL_EXPLODED";

    const miembrosIds = await NotificacionModel.getMiembrosEquipo(equipoId);

    const destinatarios = senderId
      ? miembrosIds.filter((id) => id !== Number(senderId))
      : miembrosIds;

    if (destinatarios.length === 0) {
      return res
        .status(200)
        .json({ message: "El equipo no tiene otros miembros." });
    }

    resultado = await NotificacionModel.createMasiva({
      usuariosIds: destinatarios,
      contenido,
      url,
      rutaId,
      equipoId,
    });

    if (io) {
      // Iteramos sobre los datos insertados para enviar el ID correcto a cada uno
      resultado.datos.forEach((item) => {
        io.to(`usuario_${item.usuarioId}`).emit("nueva_notificacion", {
          // IMPORTANTE: PascalCase
          id: item.id, // El ID real de SU notificación
          Contenido: contenido,
          Fecha: new Date(),
          Leida: "N",
          URL: url,
          EquipoId: equipoId,
          RutaId: rutaId || 0,
          NombreEquipo: "Equipo", // Puedes poner "Nuevo mensaje de equipo" o dejarlo vacío, el front lo maneja
          NombrePersona: "",
        });
      });
    }

    // --- CASO 3: INDIVIDUAL ---
  } else if (usuarioId) {
    tipoEnvio = "INDIVIDUAL";
    const data = { usuarioId, contenido, url, rutaId };
    resultado = await NotificacionModel.createIndividual(data);
    const notificacionCompleta = await NotificacionModel.getById(resultado.id);

    if (io) {
      // Aquí ya enviabas notificacionCompleta que viene de BD (con Mayúsculas), así que esto funcionaba bien.
      io.to(`usuario_${usuarioId}`).emit(
        "nueva_notificacion",
        notificacionCompleta
      );
    }
  } else {
    return res.status(400).json({ message: "Faltan parámetros." });
  }

  res.status(201).json({
    message: "Notificaciones creadas.",
    tipo: tipoEnvio,
    data: resultado,
  });
});

/**
 * Obtiene notificaciones para un usuario específico.
 * Requiere parametro :usuarioId
 */
export const getNotificacionesByUsuario = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  if (isNaN(usuarioId))
    return res.status(400).json({ message: "ID inválido." });
  const notificaciones = await NotificacionModel.getByUsuarioId(usuarioId);
  res.status(200).json(notificaciones);
});

export const markNotificacionAsRead = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const actualizada = await NotificacionModel.markAsRead(id);
  if (!actualizada) return res.status(404).json({ message: "No encontrado" });
  res.status(200).json({ message: "Leída" });
});

/**
 * Marca todas las notificaciones de un usuario como leídas
 */
export const markAllNotificacionesAsRead = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  if (isNaN(usuarioId))
    return res.status(400).json({ message: "ID inválido." });

  const count = await NotificacionModel.markAllAsReadByUsuario(usuarioId);
  res.status(200).json({
    message: "Notificaciones marcadas como leídas",
    count,
  });
});

/**
 * Elimina una notificación específica
 */
export const deleteNotificacion = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

  const eliminada = await NotificacionModel.deleteById(id);
  if (!eliminada)
    return res.status(404).json({ message: "Notificación no encontrada" });

  res.status(200).json({ message: "Notificación eliminada" });
});

/**
 * Elimina todas las notificaciones de un usuario
 */
export const deleteAllNotificaciones = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  if (isNaN(usuarioId))
    return res.status(400).json({ message: "ID inválido." });

  const count = await NotificacionModel.deleteAllByUsuario(usuarioId);
  res.status(200).json({
    message: "Todas las notificaciones eliminadas",
    count,
  });
});

/**
 * Elimina solo las notificaciones leídas de un usuario
 */
export const deleteReadNotificaciones = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  if (isNaN(usuarioId))
    return res.status(400).json({ message: "ID inválido." });

  const count = await NotificacionModel.deleteReadByUsuario(usuarioId);
  res.status(200).json({
    message: "Notificaciones leídas eliminadas",
    count,
  });
});
