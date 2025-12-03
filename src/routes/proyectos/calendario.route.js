import { Router } from "express";
import { getActividadesCalendario } from "../../controllers/proyectos/calendario.controller.js";

const router = Router();

router.route("/calendario/actividades/:userId").get(getActividadesCalendario);

export default router;
