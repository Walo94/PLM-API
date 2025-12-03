import { HormaModel } from '../../models/catalogos/horma.model.js';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('Error en el controlador:', err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      message: err.message || 'Ocurrió un error en el servidor.',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

/**
 * Crea una nueva horma.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.descripcion) {
    return res.status(400).json({ message: 'La descripción es requerida' });
  }
  
  const nuevaHorma = await HormaModel.create(req.body);
  res.status(201).json(nuevaHorma);
});

/**
 * Obtiene todas las hormas.
 */
export const getAll = asyncHandler(async (req, res) => {
  const hormas = await HormaModel.getAll();
  res.status(200).json(hormas);
});

/**
 * Actualiza una horma por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  
  if (!req.body.descripcion) {
    return res.status(400).json({ message: 'La descripción es requerida' });
  }
  
  const hormaActualizada = await HormaModel.update(id, req.body);
  res.status(200).json(hormaActualizada);
});

/**
 * Actualiza el estatus de una horma por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  
  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: 'El estatus es requerido' });
  }
  
  const hormaActualizada = await HormaModel.updateStatus(id, req.body);
  res.status(200).json(hormaActualizada);
});