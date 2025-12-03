import { Router } from "express";
import {
  createNotificacion,
  getNotificacionesByUsuario,
  markNotificacionAsRead,
  markAllNotificacionesAsRead,
  deleteNotificacion,
  deleteAllNotificaciones,
  deleteReadNotificaciones,
} from "../../controllers/utils/notificaciones.controller.js";

const router = Router();

// POST /PLM/notificaciones
// Body opciones:
// 1. { personaId: 1, ... } -> Individual
// 2. { equipoId: 5, ... } -> Grupal (Registro único visible para todos del grupo)
// 3. { usuariosIds: [1,2,3], ... } -> Masivo (Registros múltiples)
router.route("/notificaciones").post(createNotificacion);
// Obtiene todas las notificaciones (Directas + Grupos donde está incluido el usuario)
router.route("/notificaciones/:usuarioId").get(getNotificacionesByUsuario);
router.route("/notificaciones/leida/:id").patch(markNotificacionAsRead);
router
  .route("/notificaciones/marcar-todas-leidas/:usuarioId")
  .patch(markAllNotificacionesAsRead);
router.route("/notificaciones/:id").delete(deleteNotificacion);
router
  .route("/notificaciones/todas/:usuarioId")
  .delete(deleteAllNotificaciones);
router
  .route("/notificaciones/leidas/:usuarioId")
  .delete(deleteReadNotificaciones);

export default router;
