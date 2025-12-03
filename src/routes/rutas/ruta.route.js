import { Router } from "express";
import {
  create,
  getAll,
  getById,
  updateById,
  updateStatus,
} from "../../controllers/rutas/ruta.controller.js";

const router = Router();

router.route("/rutas").post(create).get(getAll);
router.route("/rutas/:id").get(getById).put(updateById);
router.route("/rutas/:id/estatus").put(updateStatus);

export default router;
