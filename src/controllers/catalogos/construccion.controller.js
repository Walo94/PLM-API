import { ConstruccionModel } from "../../models/catalogos/construccion.model.js";

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
 * Crea una nueva construcción.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  const nuevaConstruccion = await ConstruccionModel.create(req.body);
  res.status(201).json(nuevaConstruccion);
});

/**
 * Obtiene todas las construcciones.
 */
export const getAll = asyncHandler(async (req, res) => {
  const construcciones = await ConstruccionModel.getAll();
  res.status(200).json(construcciones);
});

/**
 * Actualiza una construcción por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (!req.body.descripcion) {
    return res.status(400).json({ message: "La descripción es requerida" });
  }

  const construccionActualizada = await ConstruccionModel.update(id, req.body);
  res.status(200).json(construccionActualizada);
});

/**
 * Actualiza el estatus de una construcción por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: "El estatus es requerido" });
  }

  const construccionActualizada = await ConstruccionModel.updateStatus(
    id,
    req.body
  );
  res.status(200).json(construccionActualizada);
});
