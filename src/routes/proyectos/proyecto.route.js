import { Router } from "express";
import {
  create,
  getAll,
  getById,
  updateActividadEstatus,
  getActividadesPorResponsable,
  getDashboard,
  getByUser,
  getDashboardByUser,
  addBitacoraNota,
  downloadBitacoraArchivo,
  upload,
  getTimeline,
  getBitacoraByActividad,
  deleteBitacoraArchivo,
  getProjectImage,
  getFichaTecnica,
  getKPIs,
  extenderDiasActividad,
  getActividadesEditables,
} from "../../controllers/proyectos/proyecto.controller.js";

const router = Router();

// Rutas específicas primero para evitar conflictos
router.get(
  "/proyectos/actividades/:actividadId/bitacora",
  getBitacoraByActividad
);
router.delete("/proyectos/bitacora/:bitacoraId", deleteBitacoraArchivo);
router.get("/proyectos/:proyectoId/imagen/:imageName", getProjectImage);
router.route("/proyectos/:id/kpis").get(getKPIs);

// --- RUTA CORREGIDA PARA CREAR PROYECTO ---
// Se agrega upload.array("images") para procesar FormData y archivos
router.route("/proyectos").post(upload.array("images"), create).get(getAll);

router.route("/proyectos/usuario/:userId").get(getByUser);
router.route("/proyectos/dashboard/usuario/:userId").get(getDashboardByUser);
router.route("/proyectos/:id/ficha-tecnica").get(getFichaTecnica);
// Obtener actividades que aún permiten edición de tiempo
router.get("/proyectos/:id/actividades-editables", getActividadesEditables);
// Extender días a una actividad (Recalcula cascada y encabezado)
router.put(
  "/proyectos/actividades/:actividadId/extender-tiempo",
  extenderDiasActividad
);

router
  .route("/proyectos/actividades/:actividadId/estatus")
  .put(updateActividadEstatus);
router
  .route("/proyectos/actividades/responsable/:responsableId")
  .get(getActividadesPorResponsable);

// Ruta para subir archivo a bitácora (usa .single porque es un solo archivo por nota)
router
  .route("/proyectos/bitacora")
  .post(upload.single("archivo"), addBitacoraNota);

router.route("/proyectos/bitacora/:bitacoraId").delete(deleteBitacoraArchivo);

router
  .route("/proyectos/:proyectoId/bitacora/:bitacoraId/descargar")
  .get(downloadBitacoraArchivo);

router.route("/proyectos/:id").get(getById);
router.route("/proyectos/:id/dashboard").get(getDashboard);
router.route("/proyectos/:id/timeline").get(getTimeline);

export default router;
