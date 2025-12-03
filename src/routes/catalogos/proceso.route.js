import { Router } from 'express';
import { create, getAll, updateById, updateStatus } from '../../controllers/catalogos/proceso.controller.js';

const router = Router();

router.route('/procesos')
  .post(create)
  .get(getAll);

router.route('/procesos/:id')
  .put(updateById);

router.route('/procesos/:id/estatus')
  .put(updateStatus);

export default router;