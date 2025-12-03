import { CorridaModel } from "../../models/catalogos/corrida.model.js";

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error en el controlador:", err);
    // Manejo manual de errores conocidos
    if (err.message === "El ID de la corrida ya existe.") {
      return res.status(409).json({ message: err.message });
    }
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      message: err.message || "Ocurrió un error en el servidor.",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

/**
 * Crea una nueva corrida.
 */
export const create = asyncHandler(async (req, res) => {
  // Validación de ID manual
  if (req.body.id === undefined || req.body.id === null) {
    return res.status(400).json({ message: "El ID es requerido" });
  }

  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  if (req.body.puntoInicial === undefined) {
    return res.status(400).json({ message: "El punto inicial es requerido" });
  }

  if (req.body.puntoFinal === undefined) {
    return res.status(400).json({ message: "El punto final es requerido" });
  }

  const nuevaCorrida = await CorridaModel.create(req.body);
  res.status(201).json(nuevaCorrida);
});

/**
 * Obtiene todas las corridas.
 */
export const getAll = asyncHandler(async (req, res) => {
  const corridas = await CorridaModel.getAll();
  res.status(200).json(corridas);
});

/**
 * Actualiza una corrida por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  if (
    req.body.puntoInicial === undefined ||
    req.body.puntoFinal === undefined
  ) {
    return res
      .status(400)
      .json({ message: "Punto inicial y final son requeridos" });
  }

  const corridaActualizada = await CorridaModel.update(id, req.body);
  res.status(200).json(corridaActualizada);
});

/**
 * Actualiza el estatus de una corrida por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: "El estatus es requerido" });
  }

  const corridaActualizada = await CorridaModel.updateStatus(id, req.body);
  res.status(200).json(corridaActualizada);
});
