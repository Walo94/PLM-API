import { Router } from "express";
import {
  create,
  getAll,
  updateById,
  updateStatus,
} from "../../controllers/catalogos/usuario.controller.js";

const router = Router();

router.route("/usuarios").post(create).get(getAll);

router.route("/usuarios/:id").put(updateById);

router.route("/usuarios/:id/estatus").put(updateStatus);

export default router;
