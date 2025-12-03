import { SuelaModel } from "../../models/catalogos/suela.model.js";

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
 * Obtiene todas las suelas.
 */
export const getAll = asyncHandler(async (req, res) => {
  const suelas = await SuelaModel.getSuelas();
  res.status(200).json(suelas);
});
