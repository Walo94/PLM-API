import { ProyectoModel } from "../../models/proyectos/proyecto.model.js";

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
 * Obtiene todas las actividades del usuario en todos sus proyectos activos
 * para mostrar en el calendario
 */
export const getActividadesCalendario = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const proyectoId = req.query.proyectoId ? Number(req.query.proyectoId) : null;

  if (isNaN(userId)) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }

  const actividades = await ProyectoModel.getActividadesCalendarioByUser(
    userId,
    proyectoId
  );

  res.status(200).json(actividades);
});
