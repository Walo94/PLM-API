import { Router } from "express";
import {
  create,
  getAll,
  updateById,
  updateStatus,
} from "../../controllers/catalogos/corrida.controller.js";

const router = Router();

router.route("/corridas").post(create).get(getAll);

router.route("/corridas/:id").put(updateById);

router.route("/corridas/:id/estatus").put(updateStatus);

export default router;
