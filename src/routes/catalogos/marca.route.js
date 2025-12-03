import { Router } from 'express';
import { create, getAll, updateById, updateStatus } from '../../controllers/catalogos/marca.controller.js';

const router = Router();

router.route('/marcas')
  .post(create)
  .get(getAll);

  /**
   * Actualiza una marca por su ID.
   */
router.route('/marcas/:id')
  .put(updateById);

  /**
   * Actualiza el estatus de una marca por su ID.
   */
router.route('/marcas/:id/estatus')
  .put(updateStatus);

export default router;