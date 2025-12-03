import { Router } from "express";
import {
  create,
  getAll,
  updateById,
  updateStatus,
} from "../../controllers/catalogos/puesto.controller.js";

const router = Router();

router.route("/puestos").post(create).get(getAll);

router.route("/puestos/:id").put(updateById);

router.route("/puestos/:id/estatus").put(updateStatus);

export default router;
