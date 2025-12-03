import { Router } from "express";
import {
  create,
  getByUsuario,
  deleteNota,
  getNotaImage,
  upload,
  update,
} from "../../controllers/utils/nota.controller.js";

const router = Router();

// Crear nota (soporta array de imágenes bajo el campo 'images')
// Ejemplo Frontend: formData.append('images', file1); formData.append('images', file2);
router.route("/notas").post(upload.array("images"), create);

// Eliminar nota
router
  .route("/notas/:id")
  .put(upload.array("images"), update)
  .delete(deleteNota);

// Ruta para ver imágenes (opcional, útil si el frontend necesita URL directa)
// Uso: /api/notas/imagen/1/mi-foto.jpg
router.get("/notas/imagen/:usuarioId/:imageName", getNotaImage);
router.route("/notas/usuario/:usuarioId").get(getByUsuario);

export default router;
