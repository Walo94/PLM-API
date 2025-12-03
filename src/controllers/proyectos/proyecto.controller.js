import { ProyectoModel } from "../../models/proyectos/proyecto.model.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ruta base para almacenamiento de Proyectos
const FILE_UPLOAD_BASE_PATH = "C:/PLM_Data/Proyectos/";

// --- Configuración de Multer ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Usar carpeta temporal
    const tempDir = path.join(FILE_UPLOAD_BASE_PATH, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = path.basename(file.originalname, extension);
    // Sanitizar nombre para evitar caracteres raros
    const safeFilename = filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    cb(null, safeFilename + "-" + uniqueSuffix + extension);
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error en el controlador:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      message: err.message || "Ocurrió un error en el servidor.",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

/**
 * Sirve la imagen de un proyecto almacenada en C:/PLM_Data/Proyectos/{ID}/
 */
export const getProjectImage = asyncHandler(async (req, res) => {
  const { proyectoId, imageName } = req.params;

  // Validación de seguridad para evitar Path Traversal (ej: ../../windows)
  const safeImageName = path.basename(imageName);

  // Construir la ruta física: C:/PLM_Data/Proyectos/{id}/{imagen}
  const filePath = path.join(
    FILE_UPLOAD_BASE_PATH,
    proyectoId.toString(),
    safeImageName
  );

  // Verificar si existe y enviar
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Puedes enviar un 404 o una imagen placeholder por defecto si lo prefieres
    res.status(404).send("Imagen no encontrada");
  }
});

/**
 * Crea un nuevo proyecto con sus actividades calculadas
 */
export const create = asyncHandler(async (req, res) => {
  // Nota: req.body ya existe aquí gracias a upload.array('images') en el router

  // 1. Parseo y limpieza de datos (FormData convierte todo a string)
  const data = {
    rutaId: Number(req.body.rutaId),
    inicioDesarrollo: req.body.inicioDesarrollo, // Date string
    fechaCompromiso: req.body.fechaCompromiso, // Date string
    modelo: req.body.modelo, // Puede ser string o number, lo dejamos como viene o convertimos a string
    marcaId: Number(req.body.marcaId),
    coleccionId: Number(req.body.coleccionId),
    tallaCentral: Number(req.body.tallaCentral),
    corridaId: Number(req.body.corridaId),
    segmentoId: Number(req.body.segmentoId),
    hormaId: Number(req.body.hormaId),
    suelaId: Number(req.body.suelaId),
    estructuraId: Number(req.body.estructuraId),
    construccionId: Number(req.body.construccionId),
    prioridadId: Number(req.body.prioridadId),
    usuarioCreacion: Number(req.body.usuarioCreacion),
    // Campos Opcionales
    codigoDDI: req.body.codigoDDI || null,
    formatoProyecto: req.body.formatoProyecto || null,
    costoMeta: req.body.costoMeta ? parseFloat(req.body.costoMeta) : null,
    precosteo: req.body.precosteo ? parseFloat(req.body.precosteo) : null,
    diferencia: req.body.diferencia ? parseFloat(req.body.diferencia) : null,
    // Imagen se maneja aparte con req.files
    imagen: null,
  };

  // 2. Validaciones de Campos Requeridos
  const missingFields = [];
  if (!data.rutaId) missingFields.push("Ruta Crítica");
  if (!data.inicioDesarrollo) missingFields.push("Inicio Desarrollo");
  if (!data.fechaCompromiso) missingFields.push("Fecha Compromiso");
  if (!data.modelo) missingFields.push("Modelo");
  if (!data.marcaId) missingFields.push("Marca");
  if (!data.coleccionId) missingFields.push("Colección");
  if (!data.tallaCentral) missingFields.push("Talla Central");
  if (!data.corridaId) missingFields.push("Corrida");
  if (!data.segmentoId) missingFields.push("Segmento");
  if (!data.hormaId) missingFields.push("Horma");
  if (!data.suelaId) missingFields.push("Suela");
  if (!data.estructuraId) missingFields.push("Estructura");
  if (!data.construccionId) missingFields.push("Construcción");
  if (!data.prioridadId) missingFields.push("Prioridad");
  if (!data.usuarioCreacion) missingFields.push("Usuario Creación");

  if (missingFields.length > 0) {
    // Eliminar archivos subidos si la validación falla
    if (req.files) {
      req.files.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    return res.status(400).json({
      message: "Faltan campos obligatorios",
      campos: missingFields,
    });
  }

  try {
    // 3. Crear el registro en Base de Datos para obtener el ID
    const nuevoProyecto = await ProyectoModel.create(data);
    const proyectoId = nuevoProyecto.id;

    // 4. Manejo de Imágenes (Mover de temp a carpeta final)
    let fileNames = [];

    // Crear directorio del proyecto: C:/PLM_Data/Proyectos/{ID}
    const projectDir = path.join(FILE_UPLOAD_BASE_PATH, proyectoId.toString());

    // Si hay archivos adjuntos
    if (req.files && req.files.length > 0) {
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      for (const file of req.files) {
        const tempPath = file.path;
        const finalPath = path.join(projectDir, file.filename);

        try {
          // Intentar renombrar (mover)
          fs.renameSync(tempPath, finalPath);
          fileNames.push(file.filename);
        } catch (error) {
          // Fallback si falla rename (ej. particiones diferentes)
          fs.copyFileSync(tempPath, finalPath);
          fs.unlinkSync(tempPath);
          fileNames.push(file.filename);
        }
      }

      // 5. Actualizar la base de datos con los nombres de archivo
      if (fileNames.length > 0) {
        const imagenJson = JSON.stringify(fileNames);
        // Asegúrate de que este método exista en tu modelo
        await ProyectoModel.updateImagen(proyectoId, imagenJson);
        nuevoProyecto.imagen = imagenJson;
      }
    }

    res.status(201).json(nuevoProyecto);
  } catch (error) {
    // Si falla la inserción en BD, limpiar archivos temp
    if (req.files) {
      req.files.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    throw error;
  }
});

/**
 * Obtiene todos los proyectos
 */
export const getAll = asyncHandler(async (req, res) => {
  const proyectos = await ProyectoModel.getAll();
  res.status(200).json(proyectos);
});

/**
 * Obtiene un proyecto por ID con sus actividades
 */
export const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  const proyecto = await ProyectoModel.getById(id);

  if (!proyecto) {
    return res.status(404).json({ message: "Proyecto no encontrado" });
  }

  res.status(200).json(proyecto);
});

/**
 * Actualiza el estatus de una actividad y emite notificaciones WebSocket
 */
export const updateActividadEstatus = asyncHandler(async (req, res) => {
  const actividadId = Number(req.params.actividadId);

  if (isNaN(actividadId)) {
    return res.status(400).json({ message: "ID de actividad inválido" });
  }

  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: "El estatus es requerido" });
  }

  if (!req.body.usuarioId) {
    return res.status(400).json({ message: "El usuario es requerido" });
  }

  const resultado = await ProyectoModel.updateActividadEstatus(
    actividadId,
    req.body
  );

  // --- EMISIÓN DE ACTUALIZACIÓN EN TIEMPO REAL VIA WEBSOCKET ---
  const io = req.app.get("io");

  if (io) {
    try {
      // Obtener información de la actividad actualizada
      const actividadActualizada = await ProyectoModel.getActividadById(
        actividadId
      );

      if (actividadActualizada && actividadActualizada.proyectoId) {
        const proyectoId = actividadActualizada.proyectoId;
        const proyectoRoom = `proyecto_${proyectoId}`;

        // Emitir a todos los usuarios conectados al room del proyecto
        io.to(proyectoRoom).emit("actividad_actualizada", {
          proyectoId: proyectoId,
          actividadId: actividadId,
          nuevoEstatus: req.body.estatus,
          diasAtrasoActividad: resultado.DiasAtrasoActividad,
          diasAtrasoProyectoTotal: resultado.DiasAtrasoProyectoTotal,
          usuarioEjecutor: req.body.usuarioId,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `🔄 Actualización en tiempo real emitida al proyecto ${proyectoId} (room: ${proyectoRoom})`
        );

        // También emitir notificaciones individuales si es necesario
        const usuariosProyecto = await ProyectoModel.getUsuariosProyecto(
          proyectoId
        );

        usuariosProyecto.forEach((usuarioId) => {
          if (usuarioId !== req.body.usuarioId) {
            const userRoom = `usuario_${usuarioId}`;

            // Esto dispara la notificación de campana (si el usuario tiene ese listener)
            io.to(userRoom).emit("nueva_actividad_proyecto", {
              proyectoId: proyectoId,
              actividadId: actividadId,
              nuevoEstatus: req.body.estatus,
            });
          }
        });

        console.log(
          `📬 Notificaciones individuales enviadas a ${
            usuariosProyecto.length - 1
          } usuarios`
        );
      }
    } catch (socketError) {
      console.error("Error al emitir notificación WebSocket:", socketError);
    }
  }

  res.status(200).json(resultado);
});

/**
 * Obtiene actividades pendientes por responsable
 */
export const getActividadesPorResponsable = asyncHandler(async (req, res) => {
  const responsableId = Number(req.params.responsableId);

  if (isNaN(responsableId)) {
    return res.status(400).json({ message: "ID de responsable inválido" });
  }

  const actividades = await ProyectoModel.getActividadesPorResponsable(
    responsableId
  );

  res.status(200).json(actividades);
});

/**
 * Obtiene el dashboard/resumen de un proyecto
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  const proyecto = await ProyectoModel.getById(id);

  if (!proyecto) {
    return res.status(404).json({ message: "Proyecto no encontrado" });
  }

  // Calcular estadísticas
  const totalActividades = proyecto.actividades.length;
  const actividadesCompletadas = proyecto.actividades.filter(
    (a) => a.estatus === 3
  ).length;
  const actividadesPendientes = proyecto.actividades.filter(
    (a) => a.estatus === 1
  ).length;
  const actividadesEnProceso = proyecto.actividades.filter(
    (a) => a.estatus === 2
  ).length;
  const actividadesAtrasadas = proyecto.actividades.filter(
    (a) => a.estatus === 4
  ).length;

  const dashboard = {
    proyecto: {
      id: proyecto.id,
      codigoDDI: proyecto.codigoDDI,
      modelo: proyecto.modelo,
      inicioDesarrollo: proyecto.inicioDesarrollo,
      fechaCompromiso: proyecto.fechaCompromiso,
      fechaCalculadaFin: proyecto.fechaCalculadaFin,
      porcentajeAvance: proyecto.porcentajeAvance,
      diasAtraso: proyecto.diasAtraso,
      estatus: proyecto.estatus,
    },
    estadisticas: {
      totalActividades,
      actividadesCompletadas,
      actividadesPendientes,
      actividadesEnProceso,
      actividadesAtrasadas,
      porcentajeCompletado:
        totalActividades > 0
          ? ((actividadesCompletadas / totalActividades) * 100).toFixed(2)
          : 0,
    },
    proximasActividades: proyecto.actividades
      .filter((a) => a.estatus === 1 || a.estatus === 2)
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        orden: a.orden,
        actividadNombre: a.actividadNombre,
        procesoNombre: a.procesoNombre,
        responsableNombre: a.responsableNombre,
        fechaInicioCalculada: a.fechaInicioCalculada,
        fechaFinCalculada: a.fechaFinCalculada,
        diasHabiles: a.diasHabiles,
        estatus: a.estatus,
      })),
  };

  res.status(200).json(dashboard);
});

/**
 * Obtiene proyectos completos activos para el dashboard del usuario
 */
export const getDashboardByUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }

  const proyectos = await ProyectoModel.getDashboardByUser(userId);
  res.status(200).json(proyectos);
});

/**
 * Obtiene proyectos activos donde participa un usuario
 */
export const getByUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }

  const proyectos = await ProyectoModel.getByUserInvolvement(userId);
  res.status(200).json(proyectos);
});

/**
 * Obtiene la línea de tiempo (Plan vs Real) del proyecto
 */
export const getTimeline = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

  const timeline = await ProyectoModel.getTimeline(id);
  res.status(200).json(timeline);
});

/**
 * Agrega una nota a la bitácora, opcionalmente con un archivo adjunto.
 */
export const addBitacoraNota = asyncHandler(async (req, res) => {
  // Datos vienen en req.body (FormData)
  const {
    proyectoId,
    proyectoActividadId,
    usuarioId,
    estatusActual,
    comentario,
  } = req.body;

  if (!proyectoId || !proyectoActividadId || !usuarioId) {
    throw new Error(
      "Faltan datos requeridos (proyectoId, actividadId, usuarioId)"
    );
  }

  let nombreArchivoFinal = null;

  // 1. Manejo del Archivo Físico
  if (req.file) {
    const proyectoIdNum = Number(proyectoId);

    // Crear directorio del proyecto: C:/PLM_Data/Proyectos/{ID}
    const projectDir = path.join(
      FILE_UPLOAD_BASE_PATH,
      proyectoIdNum.toString()
    );
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const tempPath = req.file.path;
    const finalPath = path.join(projectDir, req.file.filename);

    try {
      // Mover de temp a carpeta final
      fs.renameSync(tempPath, finalPath);
      nombreArchivoFinal = req.file.filename;
    } catch (error) {
      // Fallback copy/unlink
      fs.copyFileSync(tempPath, finalPath);
      fs.unlinkSync(tempPath);
      nombreArchivoFinal = req.file.filename;
    }
  }

  // 2. Guardar en Base de Datos
  const data = {
    proyectoActividadId: Number(proyectoActividadId),
    usuarioId: Number(usuarioId),
    estatusActual: Number(estatusActual),
    comentario: comentario || "",
    archivos: nombreArchivoFinal, // Guardamos el nombre del archivo en la columna
  };

  const result = await ProyectoModel.addBitacoraNota(data);

  // 3. Emitir evento WebSocket (Opcional, reutilizando lógica existente)
  const io = req.app.get("io");
  if (io) {
    const room = `proyecto_${proyectoId}`;
    io.to(room).emit("actividad_actualizada", {
      proyectoId: Number(proyectoId),
      actividadId: Number(proyectoActividadId),
      tipo: "NUEVA_BITACORA",
      usuarioEjecutor: Number(usuarioId),
    });
  }

  res.status(201).json(result);
});

/**
 * Descarga un archivo de la bitácora
 */
export const downloadBitacoraArchivo = asyncHandler(async (req, res) => {
  const bitacoraId = Number(req.params.bitacoraId);
  const proyectoId = Number(req.params.proyectoId); // Necesitamos el ID del proyecto para la carpeta

  if (isNaN(bitacoraId) || isNaN(proyectoId)) {
    return res.status(400).json({ message: "IDs inválidos" });
  }

  // Obtener info de la bitácora para saber el nombre del archivo
  const bitacoraEntry = await ProyectoModel.getBitacoraById(bitacoraId);
  const nombreArchivo = bitacoraEntry?.Archivos || bitacoraEntry?.archivos;

  if (!bitacoraEntry || !nombreArchivo) {
    return res
      .status(404)
      .json({ message: "Archivo no encontrado en registro." });
  }

  const filePath = path.join(
    FILE_UPLOAD_BASE_PATH,
    proyectoId.toString(),
    nombreArchivo
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "El archivo físico no existe." });
  }

  // Extraer nombre original legible (quitando el timestamp si quieres, o dejarlo así)
  res.download(filePath, nombreArchivo);
});

/**
 * Elimina un archivo de bitácora (solo el usuario que lo subió)
 */
/**
 * Elimina un archivo de bitácora (solo el usuario que lo subió)
 */
export const deleteBitacoraArchivo = asyncHandler(async (req, res) => {
  const bitacoraId = Number(req.params.bitacoraId);

  // CORRECCIÓN: El usuarioId debe venir del body o de la sesión/JWT
  const usuarioId = Number(req.body.usuarioId);

  if (isNaN(bitacoraId)) {
    return res.status(400).json({ message: "ID de bitácora inválido" });
  }

  if (!usuarioId) {
    return res.status(400).json({ message: "Usuario no identificado" });
  }

  // Obtener el registro para verificar permisos y archivo
  const bitacoraEntry = await ProyectoModel.getBitacoraById(bitacoraId);

  if (!bitacoraEntry) {
    return res.status(404).json({ message: "Registro no encontrado" });
  }

  // Validar que el usuario sea el dueño del archivo
  if (bitacoraEntry.UsuarioId !== usuarioId) {
    return res
      .status(403)
      .json({ message: "No tienes permiso para eliminar este archivo" });
  }

  // Si hay archivo físico, eliminarlo
  if (bitacoraEntry.Archivos) {
    const proyectoId = bitacoraEntry.ProyectoId;
    const filePath = path.join(
      FILE_UPLOAD_BASE_PATH,
      proyectoId.toString(),
      bitacoraEntry.Archivos
    );

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Archivo eliminado: ${filePath}`);
      } catch (error) {
        console.error("Error al eliminar archivo físico:", error);
        // No fallar si el archivo físico no se puede eliminar
      }
    }
  }

  // Eliminar registro de la base de datos
  await ProyectoModel.deleteBitacora(bitacoraId, usuarioId);

  // Emitir evento WebSocket para actualizar en tiempo real
  const io = req.app.get("io");
  if (io && bitacoraEntry.ProyectoId) {
    io.to(`proyecto_${bitacoraEntry.ProyectoId}`).emit(
      "actividad_actualizada",
      {
        proyectoId: bitacoraEntry.ProyectoId,
        actividadId: bitacoraEntry.ProyectoActividadId,
        tipo: "BITACORA_ELIMINADA",
        usuarioEjecutor: usuarioId,
      }
    );
  }

  res.status(200).json({ success: true });
});

/**
 * Obtiene la bitácora de una actividad con nombres de usuarios
 */
export const getBitacoraByActividad = asyncHandler(async (req, res) => {
  const actividadId = Number(req.params.actividadId);

  if (isNaN(actividadId)) {
    return res.status(400).json({ message: "ID de actividad inválido" });
  }

  const bitacora = await ProyectoModel.getBitacoraByActividad(actividadId);
  res.status(200).json(bitacora);
});

/**
 * Obtiene datos completos para la ficha técnica
 */
export const getFichaTecnica = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

  const proyecto = await ProyectoModel.getFichaTecnica(id);

  if (!proyecto) {
    return res.status(404).json({ message: "Proyecto no encontrado" });
  }

  res.status(200).json(proyecto);
});
