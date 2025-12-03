import { Router } from "express";
import {
  create,
  getAll,
  updateById,
  updateStatus,
} from "../../controllers/catalogos/estructura.controller.js";

const router = Router();

router.route("/estructuras").post(create).get(getAll);

router.route("/estructuras/:id").put(updateById);

router.route("/estructuras/:id/estatus").put(updateStatus);

export default router;
