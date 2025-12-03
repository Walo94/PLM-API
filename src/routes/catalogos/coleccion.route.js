import { Router } from 'express';
import { create, getAll, updateById, updateStatus } from '../../controllers/catalogos/coleccion.controller.js';

const router = Router();

router.route('/colecciones')
  .post(create)
  .get(getAll);

router.route('/colecciones/:id')
  .put(updateById);

router.route('/colecciones/:id/estatus')
  .put(updateStatus);

export default router;