import { Router } from 'express';
import { create, getAll, updateById, updateStatus } from '../../controllers/catalogos/horma.controller.js';

const router = Router();

router.route('/hormas')
  .post(create)
  .get(getAll);

  /**
   * Actualiza una marca por su ID.
   */
router.route('/hormas/:id')
  .put(updateById);

  /**
   * Actualiza el estatus de una marca por su ID.
   */
router.route('/hormas/:id/estatus')
  .put(updateStatus);

export default router;