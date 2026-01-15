import { DiaNoLaborableModel } from "../../models/catalogos/diaNoLaborable.model.js";

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
 * Crea un nuevo día no laborable.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.fecha) {
    return res.status(400).json({ message: "La fecha es requerida" });
  }
  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  const nuevoDia = await DiaNoLaborableModel.create(req.body);
  res.status(201).json(nuevoDia);
});

/**
 * Obtiene todos los días no laborables.
 */
export const getAll = asyncHandler(async (req, res) => {
  const dias = await DiaNoLaborableModel.getAll();
  res.status(200).json(dias);
});

/**
 * Obtiene un día no laborable por su ID.
 */
export const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  const dia = await DiaNoLaborableModel.getById(id);

  if (!dia) {
    return res.status(404).json({ message: "Día no laborable no encontrado" });
  }

  res.status(200).json(dia);
});

/**
 * Actualiza un día no laborable por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (!req.body.fecha) {
    return res.status(400).json({ message: "La fecha es requerida" });
  }

  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  const diaActualizado = await DiaNoLaborableModel.update(id, req.body);
  res.status(200).json(diaActualizado);
});

/**
 * Elimina un día no laborable por su ID.
 */
export const deleteById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  await DiaNoLaborableModel.delete(id);
  res.status(200).json({ message: "Día no laborable eliminado exitosamente" });
});
