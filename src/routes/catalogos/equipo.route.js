import { Router } from "express";
import {
  create,
  getAll,
  updateById,
  updateStatus,
  getByTeam,
  getById,
} from "../../controllers/catalogos/equipo.controller.js";

const router = Router();

router.route("/equipos").post(create).get(getAll);

router.route("/equipos/:id").put(updateById);

router.route("/equipos/:id/estatus").put(updateStatus);

router.route("/equipos/:id/personas").get(getByTeam);

router.route("/equipos/:id").get(getById);

export default router;
