import { Router } from "express";
import { getAll } from "../../controllers/catalogos/suela.controller.js";

const router = Router();

router.route("/suelas").get(getAll);

export default router;
