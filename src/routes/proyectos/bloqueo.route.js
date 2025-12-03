import { Router } from "express";
import {
  addBloqueo,
  getBloqueosByProyecto,
  getBloqueosByUser,
  resolveBloqueo,
} from "../../controllers/proyectos/bloqueo.controller.js";

const router = Router();

router.route("/proyectos/actividades/bloqueo").post(addBloqueo);
router.route("/proyectos/:id/bloqueos").get(getBloqueosByProyecto);
router.route("/proyectos/usuario/:userId/bloqueos").get(getBloqueosByUser);
router.route("/proyectos/bloqueos/:bloqueoId/liberar").put(resolveBloqueo);

export default router;
