import { SegmentoModel } from '../../models/catalogos/segmento.model.js';

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
 * Crea un nuevo segmento.
 */
export const create = asyncHandler(async (req, res) => {
    if (!req.body.descripcion) {
        return res.status(400).json({ message: 'La descripción es requerida' });
    }

    const nuevoSegmento = await SegmentoModel.create(req.body);
    res.status(201).json(nuevoSegmento);
});

/**
 * Obtiene todos los segmentos.
 */
export const getAll = asyncHandler(async (req, res) => {
    const segmentos = await SegmentoModel.getAll();
    res.status(200).json(segmentos);
});

/**
 * Actualiza un segmento por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ message: 'ID inválido' });
    }

    if (!req.body.descripcion) {
        return res.status(400).json({ message: 'La descripción es requerida' });
    }

    const segmentoActualizado = await SegmentoModel.update(id, req.body);
    res.status(200).json(segmentoActualizado);
});

/**
 * Actualiza el estatus de un segmento por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ message: 'ID inválido' });
    }

    if (req.body.estatus === undefined) {
        return res.status(400).json({ message: 'El estatus es requerido' });
    }

    const segmentoActualizado = await SegmentoModel.updateStatus(id, req.body);
    res.status(200).json(segmentoActualizado);
});
