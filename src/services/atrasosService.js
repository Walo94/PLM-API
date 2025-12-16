/**
 * Servicio de Monitoreo de Atrasos en Tiempo Real
 *
 * Este servicio se ejecuta en el backend de Node.js y verifica atrasos cada hora.
 * Es una alternativa al SQL Server Agent Job para entornos sin permisos de DBA.
 */

import { AtrasosModel } from "../models/proyectos/atraso.model.js";
import { ProyectoModel } from "../models/proyectos/proyecto.model.js";
import { NotificacionModel } from "../models/utils/notificaciones.model.js";

// Configuración
const INTERVALO_VERIFICACION = 30 * 1000; // 30 segundos en milisegundos
const HORAS_LABORABLES = { inicio: 8, fin: 18 }; // 8 AM a 6 PM

let io = null;
let intervaloActivo = null;

/**
 * Verifica si es hora laboral
 */
const esHoraLaboral = () => {
  const ahora = new Date();
  const hora = ahora.getHours();
  const diaSemana = ahora.getDay(); // 0 = Domingo, 6 = Sábado

  // Solo ejecutar de Lunes (1) a Viernes (5) en horario laboral
  if (diaSemana === 0 || diaSemana === 6) return false;
  if (hora < HORAS_LABORABLES.inicio || hora >= HORAS_LABORABLES.fin)
    return false;

  return true;
};

/**
 * Procesa los atrasos y envía notificaciones
 */
const procesarAtrasos = async () => {
  try {
    console.log("🔍 [ATRASOS] Verificando atrasos en proyectos...");

    // Ejecutar stored procedure
    const actividadesAfectadas = await AtrasosModel.calcularAtrasos();

    if (actividadesAfectadas.length === 0) {
      console.log("✅ [ATRASOS] No hay nuevos atrasos");
      return;
    }

    console.log(
      `⚠️  [ATRASOS] ${actividadesAfectadas.length} actividades con atrasos detectadas`
    );

    // Agrupar actividades por proyecto
    const proyectosAfectados = new Map();

    for (const actividad of actividadesAfectadas) {
      if (!proyectosAfectados.has(actividad.ProyectoId)) {
        proyectosAfectados.set(actividad.ProyectoId, []);
      }
      proyectosAfectados.get(actividad.ProyectoId).push(actividad);
    }

    // Enviar notificaciones por cada proyecto
    for (const [proyectoId, actividades] of proyectosAfectados) {
      try {
        await enviarNotificacionesAtraso(proyectoId, actividades);
      } catch (error) {
        console.error(
          `❌ [ATRASOS] Error procesando proyecto ${proyectoId}:`,
          error
        );
      }
    }

    console.log(
      `✅ [ATRASOS] Procesamiento completado: ${proyectosAfectados.size} proyectos notificados`
    );
  } catch (error) {
    console.error("❌ [ATRASOS] Error en procesamiento:", error);
  }
};

/**
 * Envía notificaciones para un proyecto con atrasos
 */
const enviarNotificacionesAtraso = async (proyectoId, actividades) => {
  try {
    // Obtener información del proyecto
    const proyecto = await ProyectoModel.getById(proyectoId);
    if (!proyecto) {
      console.warn(`⚠️  [ATRASOS] Proyecto ${proyectoId} no encontrado`);
      return;
    }

    const proyectoNombre =
      proyecto.modelo || proyecto.codigoDDI || `#${proyectoId}`;

    // Obtener todos los usuarios del proyecto
    const usuariosProyecto = await ProyectoModel.getUsuariosProyecto(
      proyectoId
    );

    if (usuariosProyecto.length === 0) {
      console.warn(
        `⚠️  [ATRASOS] Proyecto ${proyectoId} sin usuarios asignados`
      );
      return;
    }

    // Crear mensaje de notificación
    const cantidadActividades = actividades.length;
    const diasTotales = actividades.reduce(
      (sum, act) => sum + act.DiasAtraso,
      0
    );

    let contenido;
    if (cantidadActividades === 1) {
      const act = actividades[0];
      contenido = `⚠️ La actividad "${act.ActividadNombre}" del Proyecto ${proyectoNombre} tiene ${act.DiasAtraso} día(s) de atraso`;
    } else {
      contenido = `⚠️ El Proyecto ${proyectoNombre} tiene ${cantidadActividades} actividades atrasadas con un total de ${diasTotales} días de atraso acumulado`;
    }

    const proyectoUrl = `${
      process.env.FRONTEND_URL || "http://192.168.70.108:8080"
    }/proyectos/avance/${proyectoId}`;

    // Crear notificaciones en la base de datos
    await NotificacionModel.createMasiva({
      usuariosIds: usuariosProyecto,
      contenido: contenido,
      url: proyectoUrl,
      rutaId: proyecto.rutaId,
      equipoId: null,
    });

    // Emitir eventos WebSocket si está disponible
    if (io) {
      // Emitir a cada usuario del proyecto
      usuariosProyecto.forEach((usuarioId) => {
        io.to(`usuario_${usuarioId}`).emit("atraso_proyecto", {
          proyectoId: proyectoId,
          proyectoNombre: proyectoNombre,
          actividadesAtrasadas: actividades.map((a) => ({
            id: a.ActividadId,
            nombre: a.ActividadNombre,
            diasAtraso: a.DiasAtraso,
          })),
          diasTotales: diasTotales,
          mensaje: contenido,
        });
      });

      // También emitir al room del proyecto
      io.to(`proyecto_${proyectoId}`).emit("actividad_actualizada", {
        proyectoId: proyectoId,
        tipo: "ATRASO_ACTUALIZADO",
        actividadesAfectadas: actividades.length,
        diasTotales: diasTotales,
      });
    }

    console.log(
      `✅ [ATRASOS] Notificaciones enviadas para proyecto ${proyectoId} (${usuariosProyecto.length} usuarios)`
    );
  } catch (error) {
    console.error(
      `❌ [ATRASOS] Error enviando notificaciones para proyecto ${proyectoId}:`,
      error
    );
    throw error;
  }
};

/**
 * Inicia el servicio de monitoreo
 */
export const iniciarServicioAtrasos = (socketIO) => {
  io = socketIO;

  console.log("🚀 [ATRASOS] Iniciando servicio de monitoreo de atrasos");
  console.log(
    `⏰ [ATRASOS] Intervalo de verificación: ${
      INTERVALO_VERIFICACION / 60000
    } minutos`
  );
  console.log(
    `🕐 [ATRASOS] Horario laboral: ${HORAS_LABORABLES.inicio}:00 - ${HORAS_LABORABLES.fin}:00`
  );

  // Ejecutar inmediatamente si es hora laboral
  if (esHoraLaboral()) {
    procesarAtrasos();
  }

  // Programar ejecuciones periódicas
  intervaloActivo = setInterval(() => {
    if (esHoraLaboral()) {
      procesarAtrasos();
    } else {
      console.log(
        "⏸️  [ATRASOS] Fuera de horario laboral, verificación pausada"
      );
    }
  }, INTERVALO_VERIFICACION);

  return intervaloActivo;
};

/**
 * Detiene el servicio de monitoreo
 */
export const detenerServicioAtrasos = () => {
  if (intervaloActivo) {
    clearInterval(intervaloActivo);
    intervaloActivo = null;
    console.log("🛑 [ATRASOS] Servicio de monitoreo detenido");
  }
};

/**
 * Fuerza una verificación manual (útil para testing)
 */
export const verificarAtrasosManual = async () => {
  console.log("🔧 [ATRASOS] Verificación manual iniciada");
  await procesarAtrasos();
};
