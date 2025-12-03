import { Router } from 'express';
import { create, getAll, updateById, updateStatus } from '../../controllers/catalogos/segmento.controller.js';

const router = Router();

router.route('/segmentos')
    .post(create)
    .get(getAll);

/**
 * Actualiza un segmento por su ID.
 */
router.route('/segmentos/:id')
    .put(updateById);

/**
 * Actualiza el estatus de un segmento por su ID.
 */
router.route('/segmentos/:id/estatus')
    .put(updateStatus);

export default router;
