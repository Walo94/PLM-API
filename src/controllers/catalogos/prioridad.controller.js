import { PrioridadModel } from "../../models/catalogos/prioridad.model.js";

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
 * Crea una nueva prioridad.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }
  if (!req.body.color) {
    return res.status(400).json({ message: "El color es requerido" });
  }

  const nuevaPrioridad = await PrioridadModel.create(req.body);
  res.status(201).json(nuevaPrioridad);
});

/**
 * Obtiene todas las prioridades.
 */
export const getAll = asyncHandler(async (req, res) => {
  const prioridades = await PrioridadModel.getAll();
  res.status(200).json(prioridades);
});

/**
 * Actualiza una prioridad por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  if (!req.body.color) {
    return res.status(400).json({ message: "El color es requerido" });
  }

  const prioridadActualizada = await PrioridadModel.update(id, req.body);
  res.status(200).json(prioridadActualizada);
});

/**
 * Actualiza el estatus de una prioridad por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: "El estatus es requerido" });
  }

  const prioridadActualizada = await PrioridadModel.updateStatus(id, req.body);
  res.status(200).json(prioridadActualizada);
});
