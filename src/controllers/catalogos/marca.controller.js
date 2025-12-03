import { MarcaModel } from '../../models/catalogos/marca.model.js';

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
 * Crea una nueva marca.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.descripcion) {
    return res.status(400).json({ message: 'La descripción es requerida' });
  }
  
  const nuevaMarca = await MarcaModel.create(req.body);
  res.status(201).json(nuevaMarca);
});

/**
 * Obtiene todas las marcas.
 */
export const getAll = asyncHandler(async (req, res) => {
  const marcas = await MarcaModel.getAll();
  res.status(200).json(marcas);
});

/**
 * Actualiza una marca por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  
  if (!req.body.descripcion) {
    return res.status(400).json({ message: 'La descripción es requerida' });
  }
  
  const marcaActualizada = await MarcaModel.update(id, req.body);
  res.status(200).json(marcaActualizada);
});

/**
 * Actualiza el estatus de una marca por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  
  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: 'El estatus es requerido' });
  }
  
  const marcaActualizada = await MarcaModel.updateStatus(id, req.body);
  res.status(200).json(marcaActualizada);
});