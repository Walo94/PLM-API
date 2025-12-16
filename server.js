import { createServer } from "http";
import { Server } from "socket.io";
import app from "./src/app.js";
import { iniciarServicioAtrasos } from "./src/services/atrasosService.js";

const PORT = process.env.PORT || 5000;

// Crear servidor HTTP
const httpServer = createServer(app);

// Configurar Socket.IO con CORS
const io = new Server(httpServer, {
  cors: {
    origin: "http://192.168.70.108:8080",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// --- FUNCIÓN AUXILIAR PARA EMITIR CONTEO DE EQUIPO ---
const emitirConteoEquipo = (equipoId) => {
  const roomName = `equipo_${equipoId}`;
  const room = io.sockets.adapter.rooms.get(roomName);
  const count = room ? room.size : 0;
  io.emit("update_team_users", { equipoId: Number(equipoId), count });
};

// --- FUNCIÓN AUXILIAR PARA EMITIR CONTEO DE PROYECTO ---
const emitirConteoProyecto = (proyectoId) => {
  const roomName = `proyecto_${proyectoId}`;
  const room = io.sockets.adapter.rooms.get(roomName);
  const count = room ? room.size : 0;
};

// Manejar conexiones de WebSocket
io.on("connection", (socket) => {
  console.log(`✅ Usuario conectado: ${socket.id}`);

  // --- 1. LÓGICA DE NOTIFICACIONES PERSONALES ---
  socket.on("join_notifications_user", (usuarioId) => {
    const roomName = `usuario_${usuarioId}`;
    socket.join(roomName);
    console.log(
      `🔔 Socket ${socket.id} suscrito a notificaciones de Usuario ID: ${usuarioId}`
    );
  });

  // --- 2. LÓGICA DE EQUIPOS Y CONTEO ---
  socket.on("request_teams_status", (equipoIds) => {
    if (Array.isArray(equipoIds)) {
      equipoIds.forEach((id) => {
        emitirConteoEquipo(id);
      });
    }
  });

  socket.on("join_equipo", (equipoId) => {
    const roomName = `equipo_${equipoId}`;
    socket.join(roomName);
    console.log(`👥 Socket ${socket.id} se unió al equipo ${equipoId}`);
    emitirConteoEquipo(equipoId);
  });

  socket.on("leave_equipo", (equipoId) => {
    const roomName = `equipo_${equipoId}`;
    socket.leave(roomName);
    console.log(`👋 Socket ${socket.id} salió del equipo ${equipoId}`);
    emitirConteoEquipo(equipoId);
  });

  // --- 3. LÓGICA DE PROYECTOS ---
  socket.on("join_proyecto", (proyectoId) => {
    const roomName = `proyecto_${proyectoId}`;
    socket.join(roomName);
    console.log(`📋 Socket ${socket.id} se unió al proyecto ${proyectoId}`);
    emitirConteoProyecto(proyectoId);
  });

  socket.on("leave_proyecto", (proyectoId) => {
    const roomName = `proyecto_${proyectoId}`;
    socket.leave(roomName);
    console.log(`🚪 Socket ${socket.id} salió del proyecto ${proyectoId}`);
    emitirConteoProyecto(proyectoId);
  });

  // --- 4. LÓGICA DE BLOQUEOS EN TIEMPO REAL ---
  socket.on("bloqueo_asignado", (data) => {
    console.log("🔨 Evento bloqueo_asignado recibido:", data);

    const { responsableId, proyectoId, actividadNombre } = data;

    if (!responsableId || !proyectoId || !actividadNombre) {
      console.error("❌ Datos incompletos en bloqueo_asignado:", data);
      return;
    }

    io.emit("bloqueo_asignado", {
      responsableId: Number(responsableId),
      proyectoId: Number(proyectoId),
      actividadNombre,
    });

    console.log(
      `✅ Evento bloqueo_asignado difundido globalmente para responsable ${responsableId}`
    );

    const roomName = `proyecto_${proyectoId}`;
    socket.to(roomName).emit("actividad_actualizada", {
      proyectoId: Number(proyectoId),
      mensaje: `Nuevo bloqueo en: ${actividadNombre}`,
      tipo: "bloqueo",
      actividadNombre,
    });

    console.log(`📡 Notificación de bloqueo enviada al room ${roomName}`);
  });

  socket.on("bloqueo_resuelto", (data) => {
    console.log("🔨 Evento bloqueo_resuelto recibido:", data);

    const {
      usuarioReportaId,
      responsableId,
      bloqueoId,
      actividadNombre,
      proyectoId,
    } = data;

    if (!bloqueoId || !actividadNombre || !proyectoId) {
      console.error("❌ Datos incompletos en bloqueo_resuelto:", data);
      return;
    }

    io.emit("bloqueo_resuelto", {
      usuarioReportaId: Number(usuarioReportaId),
      responsableId: Number(responsableId),
      bloqueoId: Number(bloqueoId),
      actividadNombre,
      proyectoId: Number(proyectoId),
    });

    console.log(
      `✅ Evento bloqueo_resuelto difundido globalmente (Bloqueo ID: ${bloqueoId})`
    );

    const roomName = `proyecto_${proyectoId}`;
    socket.to(roomName).emit("actividad_actualizada", {
      proyectoId: Number(proyectoId),
      mensaje: `Bloqueo liberado en: ${actividadNombre}`,
      tipo: "bloqueo_resuelto",
      actividadNombre,
    });

    console.log(`📡 Notificación de liberación enviada al room ${roomName}`);
  });

  socket.on("actividad_actualizada", (data) => {
    console.log("🔨 Actividad actualizada:", data);

    const { proyectoId, usuarioEjecutor } = data;

    if (!proyectoId) {
      console.error("❌ proyectoId no proporcionado en actividad_actualizada");
      return;
    }

    const roomName = `proyecto_${proyectoId}`;
    socket.to(roomName).emit("actividad_actualizada", {
      ...data,
      proyectoId: Number(proyectoId),
    });

    console.log(`📡 Actividad actualizada enviada al room ${roomName}`);
  });

  // --- 5. MANEJO DE DESCONEXIÓN ---
  socket.on("disconnecting", () => {
    console.log(`⚠️ Usuario desconectándose: ${socket.id}`);

    for (const room of socket.rooms) {
      if (room.startsWith("equipo_")) {
        const equipoId = room.split("_")[1];
        const roomObj = io.sockets.adapter.rooms.get(room);
        const currentCount = roomObj ? roomObj.size : 0;

        io.emit("update_team_users", {
          equipoId: Number(equipoId),
          count: Math.max(0, currentCount - 1),
        });
      } else if (room.startsWith("proyecto_")) {
        const proyectoId = room.split("_")[1];
        console.log(`📉 Usuario saliendo del proyecto ${proyectoId}`);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Usuario desconectado completamente: ${socket.id}`);
  });
});

// Hacer io accesible globalmente para los Controllers
app.set("io", io);

// 🚀 INICIAR SERVICIO DE MONITOREO DE ATRASOS
iniciarServicioAtrasos(io);

// Iniciar servidor
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  console.log(`📡 API PLM disponible en http://localhost:${PORT}/PLM`);
  console.log(`🔌 WebSocket disponible en ws://localhost:${PORT}`);
  console.log(`⏰ Servicio de atrasos activo - Verificación cada hora`);
});
