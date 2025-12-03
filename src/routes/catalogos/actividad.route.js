import { Router } from 'express';
import { create, getAll, updateById, updateStatus } from '../../controllers/catalogos/actividad.controller.js';

const router = Router();

router.route('/actividades')
  .post(create)
  .get(getAll);

router.route('/actividades/:id')
  .put(updateById);

router.route('/actividades/:id/estatus')
  .put(updateStatus);

export default router;