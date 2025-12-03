import { Router } from "express";
import {
  getAtrasosProyecto,
  getAtrasosGlobales,
  calcularAtrasosManual,
  getActividadesAtrasadas,
} from "../../controllers/proyectos/atraso.controller.js";

const router = Router();

/**
 * GET /PLM/atrasos/proyecto/:proyectoId
 * Obtiene información de atrasos de un proyecto específico
 */
router.route("/atrasos/proyecto/:proyectoId").get(getAtrasosProyecto);

/**
 * GET /PLM/atrasos/globales
 * Obtiene resumen de atrasos de todos los proyectos activos
 */
router.route("/atrasos/globales").get(getAtrasosGlobales);

/**
 * GET /PLM/atrasos/actividades
 * Obtiene todas las actividades atrasadas del sistema
 */
router.route("/atrasos/actividades").get(getActividadesAtrasadas);

/**
 * POST /PLM/atrasos/calcular
 * Ejecuta el cálculo de atrasos manualmente (útil para testing)
 */
router.route("/atrasos/calcular").post(calcularAtrasosManual);

export default router;
