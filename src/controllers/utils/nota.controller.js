import { NotaModel } from "../../models/utils/nota.model.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ruta base general para usuarios
const USER_UPLOAD_BASE_PATH = "C:/PLM_Data/Usuarios/";

// --- Configuración de Multer ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Guardamos en carpeta temporal primero porque aun no tenemos el ID de la nota confirmada
    // o para procesar lotes. Usaremos una carpeta 'temp' dentro de Usuarios.
    const tempDir = path.join(USER_UPLOAD_BASE_PATH, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = path.basename(file.originalname, extension);
    // Sanitizar nombre
    const safeFilename = filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    cb(null, safeFilename + "-" + uniqueSuffix + extension);
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por imagen
});

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error en nota.controller:", err);
    res.status(500).json({
      message: err.message || "Error del servidor",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

/**
 * Crear una nota con imágenes opcionales
 */
export const create = asyncHandler(async (req, res) => {
  const { usuarioId, contenido } = req.body;

  if (!usuarioId) {
    // Si falla validación y hay archivos, borrarlos de temp
    if (req.files) {
      req.files.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    return res.status(400).json({ message: "El UsuarioId es obligatorio." });
  }

  try {
    // 1. Crear el registro en BD
    const nuevaNota = await NotaModel.create({
      usuarioId: Number(usuarioId),
      contenido: contenido || "",
    });

    const notaId = nuevaNota.id;
    let fileNames = [];

    // 2. Procesar imágenes si existen
    if (req.files && req.files.length > 0) {
      // Ruta destino: C:/PLM_Data/Usuarios/{UsuarioId}/notas
      const userNotesDir = path.join(
        USER_UPLOAD_BASE_PATH,
        usuarioId.toString(),
        "notas"
      );

      if (!fs.existsSync(userNotesDir)) {
        fs.mkdirSync(userNotesDir, { recursive: true });
      }

      for (const file of req.files) {
        const tempPath = file.path;
        const finalPath = path.join(userNotesDir, file.filename);

        try {
          // Mover archivo
          fs.renameSync(tempPath, finalPath);
          fileNames.push(file.filename);
        } catch (error) {
          // Fallback copy/unlink
          fs.copyFileSync(tempPath, finalPath);
          fs.unlinkSync(tempPath);
          fileNames.push(file.filename);
        }
      }

      // 3. Actualizar BD con el array de nombres
      if (fileNames.length > 0) {
        const imagenJson = JSON.stringify(fileNames);
        await NotaModel.updateImagenes(notaId, imagenJson);
        nuevaNota.imagenes = fileNames; // Para responder al cliente correctamente
      }
    } else {
      nuevaNota.imagenes = [];
    }

    res.status(201).json(nuevaNota);
  } catch (error) {
    // Limpieza en caso de error en BD
    if (req.files) {
      req.files.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    throw error;
  }
});

/**
 * Actualiza una nota: Texto y Archivos
 */
export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  // Nota: req.body.contenido y req.body.imagenesConservadas vienen como strings (FormData)
  const { contenido, usuarioId, imagenesConservadas } = req.body;

  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

  // 1. Obtener la nota actual para saber qué imágenes tenía
  const notaActual = await NotaModel.getById(id);
  if (!notaActual) {
    // Limpiar temporales si fallamos
    if (req.files)
      req.files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    return res.status(404).json({ message: "Nota no encontrada" });
  }

  // Verificación de seguridad (opcional, si se envía usuarioId)
  if (usuarioId && Number(usuarioId) !== notaActual.usuarioId) {
    if (req.files)
      req.files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    return res
      .status(403)
      .json({ message: "No tienes permiso para editar esta nota" });
  }

  // 2. Determinar las imágenes finales
  let listaFinalImagenes = [];

  // A) Imágenes "Viejas":
  // Si el front envía 'imagenesConservadas', usamos esa lista (permite borrar).
  // Si no envía nada, asumimos que se quedan todas las que ya estaban.
  if (imagenesConservadas) {
    try {
      // El front debe enviar un JSON array string: '["foto1.jpg"]'
      listaFinalImagenes = JSON.parse(imagenesConservadas);

      // (Opcional) Borrar físicamente las que ya no están en la lista
      const imagenesAborrar = notaActual.imagenes.filter(
        (img) => !listaFinalImagenes.includes(img)
      );
      const userNotesDir = path.join(
        USER_UPLOAD_BASE_PATH,
        notaActual.usuarioId.toString(),
        "notas"
      );

      imagenesAborrar.forEach((img) => {
        const pathBorrar = path.join(userNotesDir, img);
        if (fs.existsSync(pathBorrar)) fs.unlinkSync(pathBorrar);
      });
    } catch (e) {
      console.error("Error parseando imagenesConservadas", e);
      listaFinalImagenes = notaActual.imagenes || [];
    }
  } else {
    // Si no se especifica, conservamos lo que había
    listaFinalImagenes = notaActual.imagenes || [];
  }

  // B) Imágenes "Nuevas" (Subidas en este request)
  if (req.files && req.files.length > 0) {
    const userNotesDir = path.join(
      USER_UPLOAD_BASE_PATH,
      notaActual.usuarioId.toString(),
      "notas"
    );

    if (!fs.existsSync(userNotesDir)) {
      fs.mkdirSync(userNotesDir, { recursive: true });
    }

    for (const file of req.files) {
      const tempPath = file.path;
      const finalPath = path.join(userNotesDir, file.filename);

      try {
        fs.renameSync(tempPath, finalPath);
        // Agregamos el nombre nuevo a la lista final
        listaFinalImagenes.push(file.filename);
      } catch (error) {
        fs.copyFileSync(tempPath, finalPath);
        fs.unlinkSync(tempPath);
        listaFinalImagenes.push(file.filename);
      }
    }
  }

  // 3. Actualizar BD
  const datosUpdate = {
    contenido: contenido !== undefined ? contenido : notaActual.contenido,
    imagenes: JSON.stringify(listaFinalImagenes),
  };

  await NotaModel.update(id, datosUpdate);

  // 4. Responder con los datos actualizados
  res.status(200).json({
    id,
    usuarioId: notaActual.usuarioId,
    ...datosUpdate,
    imagenes: listaFinalImagenes, // Enviamos el array parseado
  });
});

/**
 * Obtener notas por usuario
 */
export const getByUsuario = asyncHandler(async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);

  if (isNaN(usuarioId)) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }

  const notas = await NotaModel.getByUsuarioId(usuarioId);
  res.status(200).json(notas);
});

/**
 * Eliminar nota y sus archivos físicos
 */
export const deleteNota = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const usuarioIdSolicitante = Number(req.body.usuarioId); // Por seguridad

  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

  const nota = await NotaModel.getById(id);

  if (!nota) {
    return res.status(404).json({ message: "Nota no encontrada" });
  }

  // Verificar que la nota pertenezca al usuario (si se envía usuarioId)
  if (usuarioIdSolicitante && nota.usuarioId !== usuarioIdSolicitante) {
    return res
      .status(403)
      .json({ message: "No tienes permiso para eliminar esta nota." });
  }

  // 1. Eliminar archivos físicos
  if (nota.imagenes && nota.imagenes.length > 0) {
    const userNotesDir = path.join(
      USER_UPLOAD_BASE_PATH,
      nota.usuarioId.toString(),
      "notas"
    );

    nota.imagenes.forEach((fileName) => {
      const filePath = path.join(userNotesDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Error eliminando archivo ${filePath}`, err);
        }
      }
    });
  }

  // 2. Eliminar registro BD
  await NotaModel.delete(id);

  res
    .status(200)
    .json({ success: true, message: "Nota eliminada correctamente" });
});

/**
 * Servir imagen de nota (opcional, si no sirves estáticos directamente)
 */
export const getNotaImage = asyncHandler(async (req, res) => {
  const { usuarioId, imageName } = req.params;

  // Validar para evitar Path Traversal
  const safeImageName = path.basename(imageName);
  const filePath = path.join(
    USER_UPLOAD_BASE_PATH,
    usuarioId,
    "notas",
    safeImageName
  );

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Imagen no encontrada");
  }
});
