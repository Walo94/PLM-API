import { Router } from "express";
import {
  create,
  getAll,
  updateById,
  updateStatus,
} from "../../controllers/catalogos/departamento.controller.js";

const router = Router();

router.route("/departamentos").post(create).get(getAll);

router.route("/departamentos/:id").put(updateById);

router.route("/departamentos/:id/estatus").put(updateStatus);

export default router;
