import { Router } from "express";
import {
  upload,
  createMensaje,
  getMensajesByEquipoId,
  deleteMensajeById,
  uploadFile,
  getArchivosByEquipoId,
  downloadFile,
  deleteArchivoById,
} from "../../controllers/equipos/equipoComunicacion.controller.js";

const router = Router();

// --- Rutas de Mensajes ---

// POST /PLM/equipos/mensajes: Crear un nuevo mensaje de texto
// GET /PLM/equipos/mensajes/1: Obtener todos los mensajes de un EquipoId
router.route("/equipos/mensajes").post(createMensaje);
router.route("/equipos/mensajes/:equipoId").get(getMensajesByEquipoId);
router.route("/equipos/mensajes/:id").delete(deleteMensajeById);

// --- Rutas de Archivos ---

// POST /PLM/equipos/archivos: Subir un nuevo archivo
// Nota: 'archivo' debe coincidir con el 'name' del input de tipo file en el frontend.
router.route("/equipos/archivos").post(upload.single("archivo"), uploadFile);

// GET /PLM/equipos/archivos/1: Obtener la lista de archivos de un EquipoId
router.route("/equipos/archivos/:equipoId").get(getArchivosByEquipoId);

// GET /PLM/equipos/archivos/descargar/1: Descargar un archivo por su ID de BD
router.route("/equipos/archivos/descargar/:id").get(downloadFile);

// DELETE /PLM/equipos/archivos/1: Eliminar un archivo por su ID de BD
router.route("/equipos/archivos/:id").delete(deleteArchivoById);

export default router;
