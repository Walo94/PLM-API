import { Router } from "express";
import {
  create,
  getAll,
  updateById,
  updateStatus,
} from "../../controllers/catalogos/prioridad.controller.js";

const router = Router();

router.route("/prioridades").post(create).get(getAll);

router.route("/prioridades/:id").put(updateById);

router.route("/prioridades/:id/estatus").put(updateStatus);

export default router;
