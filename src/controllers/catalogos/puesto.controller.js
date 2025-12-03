import { PuestoModel } from "../../models/catalogos/puesto.model.js";

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
 * Crea una nuevo puesto.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  if (!req.body.departamento) {
    return res.status(400).json({ message: "El departamento es requerido" });
  }

  const nuevoPuesto = await PuestoModel.create(req.body);
  res.status(201).json(nuevoPuesto);
});

/**
 * Obtiene todos los puestos.
 */
export const getAll = asyncHandler(async (req, res) => {
  const puestos = await PuestoModel.getAll();
  res.status(200).json(puestos);
});

/**
 * Actualiza un puesto por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  if (!req.body.departamento) {
    return res.status(400).json({ message: "El departamento es requerido" });
  }

  const puestoActualizado = await PuestoModel.update(id, req.body);
  res.status(200).json(puestoActualizado);
});

/**
 * Actualiza el estatus de un puesto por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: "El estatus es requerido" });
  }

  const puestoActualizado = await PuestoModel.updateStatus(id, req.body);
  res.status(200).json(puestoActualizado);
});
