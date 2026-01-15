import { Router } from "express";
import {
  create,
  getAll,
  getById,
  updateById,
  deleteById,
} from "../../controllers/catalogos/diaNoLaborable.controller.js";

const router = Router();

router.route("/dias-no-laborables").post(create).get(getAll);

router
  .route("/dias-no-laborables/:id")
  .get(getById)
  .put(updateById)
  .delete(deleteById);

export default router;
