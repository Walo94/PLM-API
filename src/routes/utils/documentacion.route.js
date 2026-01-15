import { Router } from "express";
import {
  getDocumentacionPDF,
  downloadDocumentacionPDF,
} from "../../controllers/utils/documentacion.controller.js";

const router = Router();

// GET /PLM/documentacion/pdf: Ver el PDF en el navegador
router.route("/documentacion/pdf").get(getDocumentacionPDF);

// GET /PLM/documentacion/pdf/descargar: Descargar el PDF
router.route("/documentacion/pdf/descargar").get(downloadDocumentacionPDF);

export default router;
