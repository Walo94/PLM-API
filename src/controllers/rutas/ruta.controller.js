import { RutaModel } from "../../models/rutas/ruta.model.js";

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
 * Crea una nueva ruta con su detalle.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.nombre) {
    return res.status(400).json({ message: "El nombre es requerido" });
  }
  if (!req.body.detalles || req.body.detalles.length === 0) {
    return res
      .status(400)
      .json({ message: "Los detalles de la ruta son requeridos" });
  }

  const nuevaRuta = await RutaModel.create(req.body);
  res.status(201).json(nuevaRuta);
});

/**
 * Obtiene todas las rutas.
 */
export const getAll = asyncHandler(async (req, res) => {
  const rutas = await RutaModel.getAll();
  res.status(200).json(rutas);
});

/**
 * Obtiene una ruta por su ID.
 */
export const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  const ruta = await RutaModel.getById(id);

  if (!ruta) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }

  res.status(200).json(ruta);
});

/**
 * Actualiza una ruta por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (!req.body.nombre) {
    return res.status(400).json({ message: "El nombre es requerido" });
  }

  if (!req.body.detalles || req.body.detalles.length === 0) {
    return res
      .status(400)
      .json({ message: "Los detalles de la ruta son requeridos" });
  }

  const rutaActualizada = await RutaModel.update(id, req.body);
  res.status(200).json(rutaActualizada);
});

/**
 * Actualiza el estatus de una ruta por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: "El estatus es requerido" });
  }

  const rutaActualizada = await RutaModel.updateStatus(id, req.body);
  res.status(200).json(rutaActualizada);
});
