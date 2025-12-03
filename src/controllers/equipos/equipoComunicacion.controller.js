import {
  MensajeModel,
  ArchivoEquipoModel,
} from "../../models/equipos/equipoComunicacion.model.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ruta base para almacenamiento (debe coincidir con la del modelo)
const FILE_UPLOAD_BASE_PATH = "C:/PLM_Data/Equipos/";

// Función auxiliar para manejar errores asíncronos en Express
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error en el controlador:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      message: err.message || "Ocurrió un error en el servidor.",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

// --- Configuración de Multer para Subida de Archivos ---

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Usar una carpeta temporal mientras se procesa
    const tempDir = path.join(FILE_UPLOAD_BASE_PATH, "temp");

    // Crear el directorio temporal si no existe
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generar un nombre único para evitar colisiones
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = path.basename(file.originalname, extension);
    cb(null, filename + "-" + uniqueSuffix + extension);
  },
});

// Middleware de Multer para manejar la subida
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Límite de 50MB
  },
});

// --- Controladores de Mensajes ---

/**
 * Crea un nuevo mensaje de texto.
 */
export const createMensaje = asyncHandler(async (req, res) => {
  const { equipoId, usuarioId, contenido } = req.body;

  if (!equipoId || !usuarioId || !contenido) {
    return res
      .status(400)
      .json({ message: "EquipoId, UsuarioId y Contenido son requeridos." });
  }

  const data = {
    equipoId: Number(equipoId),
    usuarioId: Number(usuarioId),
    contenido,
    tipo: "TEXTO",
  };

  const nuevoMensaje = await MensajeModel.create(data);
  const mensajeCompleto = await MensajeModel.getById(nuevoMensaje.id);

  // NUEVO: Obtener la instancia de Socket.IO y emitir el evento
  const io = req.app.get("io");
  if (io) {
    // Emitir el mensaje completo con nombrePersona incluido
    io.to(`equipo_${equipoId}`).emit("nuevo_mensaje", mensajeCompleto);
    console.log(`Mensaje emitido al equipo ${equipoId}:`, mensajeCompleto);
  }

  res.status(201).json(nuevoMensaje);
});

/**
 * Obtiene todos los mensajes de un equipo.
 */
export const getMensajesByEquipoId = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);

  if (isNaN(equipoId)) {
    return res.status(400).json({ message: "ID de equipo inválido." });
  }

  const mensajes = await MensajeModel.getByEquipoId(equipoId);
  res.status(200).json(mensajes);
});

/**
 * Elimina un mensaje por su ID.
 */
export const deleteMensajeById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID de mensaje inválido." });
  }

  const eliminado = await MensajeModel.deleteById(id);

  if (!eliminado) {
    return res.status(404).json({ message: "Mensaje no encontrado." });
  }

  res.status(200).json({ message: "Mensaje eliminado exitosamente." });
});

// --- Controladores de Archivos ---

/**
 * Maneja la subida de un archivo y registra el evento en Mensajes y ArchivosEquipos.
 * Usa el middleware 'upload.single('archivo')' antes de esta función.
 */
export const uploadFile = asyncHandler(async (req, res) => {
  // Multer coloca el archivo subido en req.file
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "No se proporcionó ningún archivo para subir." });
  }

  const { equipoId, usuarioId } = req.body;

  if (!equipoId || !usuarioId) {
    // Si falta data crucial, debemos eliminar el archivo temporal
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error al limpiar archivo temporal:", err);
    });
    return res.status(400).json({
      message:
        "EquipoId y PersonaId son requeridos en el cuerpo de la solicitud.",
    });
  }

  const equipoIdNum = Number(equipoId);
  const usuarioIdNum = Number(usuarioId);

  // Crear el directorio final del equipo
  const equipoDir = path.join(FILE_UPLOAD_BASE_PATH, equipoIdNum.toString());
  if (!fs.existsSync(equipoDir)) {
    fs.mkdirSync(equipoDir, { recursive: true });
  }

  // Mover el archivo de la carpeta temporal a la carpeta del equipo
  const tempPath = req.file.path;
  const finalPath = path.join(equipoDir, req.file.filename);

  try {
    fs.renameSync(tempPath, finalPath);
  } catch (error) {
    console.error("Error al mover el archivo:", error);
    // Intentar copiar y luego eliminar si rename falla (puede fallar entre discos)
    fs.copyFileSync(tempPath, finalPath);
    fs.unlinkSync(tempPath);
  }

  // 1. Registrar el Archivo en la tabla ArchivosEquipos
  const archivoData = {
    equipoId: equipoIdNum,
    usuarioId: usuarioIdNum,
    nombreArchivo: req.file.filename,
    rutaAlmacenamiento: equipoDir,
    tipoMime: req.file.mimetype,
    tamano: req.file.size,
  };

  const registroArchivo = await ArchivoEquipoModel.create(archivoData);

  // Obtener el archivo completo con el nombre de la persona
  const archivoCompleto = await ArchivoEquipoModel.getById(registroArchivo.id);

  // 2. Registrar el evento de subida como un Mensaje
  const mensajeData = {
    equipoId: equipoIdNum,
    usuarioId: usuarioIdNum,
    contenido: registroArchivo.id.toString(),
    tipo: "ARCHIVO",
  };

  const registroMensaje = await MensajeModel.create(mensajeData);

  // Obtener el mensaje completo con el nombre de la persona
  const mensajeCompleto = await MensajeModel.getById(registroMensaje.id);

  // Emitir eventos de WebSocket para archivo nuevo
  const io = req.app.get("io");
  if (io) {
    // Emitir el nuevo archivo a todos los usuarios en el room del equipo
    io.to(`equipo_${equipoIdNum}`).emit("nuevo_archivo", archivoCompleto);
    // También emitir el mensaje de archivo
    io.to(`equipo_${equipoIdNum}`).emit("nuevo_mensaje", mensajeCompleto);
    console.log(`Archivo y mensaje emitidos al equipo ${equipoIdNum}`);
  }

  res.status(201).json({
    message: "Archivo subido y registrado exitosamente.",
    archivo: archivoCompleto,
    mensaje: mensajeCompleto,
  });
});

/**
 * Obtiene todos los archivos subidos para un equipo.
 */
export const getArchivosByEquipoId = asyncHandler(async (req, res) => {
  const equipoId = Number(req.params.equipoId);

  if (isNaN(equipoId)) {
    return res.status(400).json({ message: "ID de equipo inválido." });
  }

  const archivos = await ArchivoEquipoModel.getByEquipoId(equipoId);
  res.status(200).json(archivos);
});

/**
 * Permite la descarga de un archivo.
 */
export const downloadFile = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID de archivo inválido." });
  }

  const archivo = await ArchivoEquipoModel.getById(id);

  if (!archivo) {
    return res.status(404).json({ message: "Archivo no encontrado." });
  }

  const filePath = path.join(archivo.RutaAlmacenamiento, archivo.NombreArchivo);

  // Verificar si el archivo existe físicamente
  if (!fs.existsSync(filePath)) {
    return res
      .status(404)
      .json({ message: "El archivo físico no se encontró en el servidor." });
  }

  // Obtener el nombre original sin el sufijo único para una mejor experiencia
  const originalName = archivo.NombreArchivo;

  // Descargar el archivo
  res.download(filePath, originalName, (err) => {
    if (err) {
      console.error("Error al descargar el archivo:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ message: "Error al procesar la descarga del archivo." });
      }
    }
  });
});

/**
 * Elimina un archivo por su ID (de BD y físico).
 */
export const deleteArchivoById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID de archivo inválido." });
  }

  // Obtener info del archivo antes de eliminarlo para emitir el evento
  const archivoInfo = await ArchivoEquipoModel.getById(id);
  const equipoId = archivoInfo?.EquipoId;

  const eliminado = await ArchivoEquipoModel.deleteById(id);

  if (!eliminado) {
    return res
      .status(404)
      .json({ message: "Registro de archivo no encontrado." });
  }

  // NUEVO: Emitir evento de WebSocket para archivo eliminado
  const io = req.app.get("io");
  if (io && equipoId) {
    io.to(`equipo_${equipoId}`).emit("archivo_eliminado", { id });
    console.log(
      `Evento de eliminación de archivo emitido al equipo ${equipoId}`
    );
  }

  res
    .status(200)
    .json({ message: "Archivo eliminado (BD y disco) exitosamente." });
});
