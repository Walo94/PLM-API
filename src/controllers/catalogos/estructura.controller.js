import { EstructuraModel } from "../../models/catalogos/estructura.model.js";

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
 * Crea una nueva estructura.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  const nuevaEstructura = await EstructuraModel.create(req.body);
  res.status(201).json(nuevaEstructura);
});

/**
 * Obtiene todas las estructuras.
 */
export const getAll = asyncHandler(async (req, res) => {
  const estructuras = await EstructuraModel.getAll();
  res.status(200).json(estructuras);
});

/**
 * Actualiza una estructura por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  const estructuraActualizada = await EstructuraModel.update(id, req.body);
  res.status(200).json(estructuraActualizada);
});

/**
 * Actualiza el estatus de una estructura por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: "El estatus es requerido" });
  }

  const estructuraActualizada = await EstructuraModel.updateStatus(
    id,
    req.body
  );
  res.status(200).json(estructuraActualizada);
});
