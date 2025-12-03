import { Router } from "express";
import {
  create,
  getAll,
  updateById,
  updateStatus,
} from "../../controllers/catalogos/construccion.controller.js";

const router = Router();

router.route("/construcciones").post(create).get(getAll);

router.route("/construcciones/:id").put(updateById);

router.route("/construcciones/:id/estatus").put(updateStatus);

export default router;
