import express from "express";
import cors from "cors";

// Rutas Autenticación
import authRoutes from "./routes/auth/auth.route.js";

// Rutas Catálogos
import marcaRoutes from "./routes/catalogos/marca.route.js";
import procesoRoutes from "./routes/catalogos/proceso.route.js";
import actividadRoutes from "./routes/catalogos/actividad.route.js";
import coleccionRoutes from "./routes/catalogos/coleccion.route.js";
import segmentoRoutes from "./routes/catalogos/segmento.route.js";
import hormaRoutes from "./routes/catalogos/horma.route.js";
import departamentoRoutes from "./routes/catalogos/departamento.route.js";
import puestoRoutes from "./routes/catalogos/puesto.controller.js";
import usuarioRoutes from "./routes/catalogos/usuario.route.js";
import equipoRoutes from "./routes/catalogos/equipo.route.js";
import rutaRoutes from "./routes/rutas/ruta.route.js";
import suelaRoutes from "./routes/catalogos/suela.route.js";
import construccionRoutes from "./routes/catalogos/construccion.route.js";
import estructuraRoutes from "./routes/catalogos/estructura.route.js";
import prioridadRoutes from "./routes/catalogos/prioridad.route.js";
import corridaRoutes from "./routes/catalogos/corrida.route.js";
import diaNoLaborableRoutes from "./routes/catalogos/diaNoLaborable.route.js";

// Rutas Equipos
import equipoComunicacionRoutes from "./routes/equipos/equipoComunicacion.route.js";

// Rutas Utils
import notificacionesRoutes from "./routes/utils/notificaciones.route.js";
import notaRoutes from "./routes/utils/nota.route.js";

// Rutas Proyectos
import proyectoRoutes from "./routes/proyectos/proyecto.route.js";
import bloqueoRoutes from "./routes/proyectos/bloqueo.route.js";
import calendarioRoutes from "./routes/proyectos/calendario.route.js";
import atrasosRoutes from "./routes/proyectos/atraso.router.js";

// Rutas Utils
import documentacionRoutes from "./routes/utils/documentacion.route.js";

const app = express();
const url = "/PLM";

// Middleware
app.use(cors());
app.use(express.json());

// Rutas de Autenticación (públicas)
app.use(url, authRoutes);

// Rutas de la API Catálogos
app.use(url, marcaRoutes);
app.use(url, procesoRoutes);
app.use(url, actividadRoutes);
app.use(url, coleccionRoutes);
app.use(url, segmentoRoutes);
app.use(url, hormaRoutes);
app.use(url, departamentoRoutes);
app.use(url, puestoRoutes);
app.use(url, usuarioRoutes);
app.use(url, equipoRoutes);
app.use(url, rutaRoutes);
app.use(url, suelaRoutes);
app.use(url, construccionRoutes);
app.use(url, estructuraRoutes);
app.use(url, prioridadRoutes);
app.use(url, corridaRoutes);
app.use(url, diaNoLaborableRoutes);

// Rutas Equipos
app.use(url, equipoComunicacionRoutes);

// Rutas Utils
app.use(url, notificacionesRoutes);
app.use(url, notaRoutes);

// Rutas Proyectos
app.use(url, proyectoRoutes);
app.use(url, bloqueoRoutes);
app.use(url, calendarioRoutes);
app.use(url, atrasosRoutes);

// Rutas Utils
app.use(url, documentacionRoutes);

export default app;
