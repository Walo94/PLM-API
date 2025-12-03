import { Router } from "express";
import {
  login,
  verifyToken,
  logout,
} from "../../controllers/auth/auth.controller.js";

const router = Router();

// Ruta para iniciar sesión
router.post("/auth/login", login);

// Ruta para verificar token
router.get("/auth/verify", verifyToken);

// Ruta para cerrar sesión
router.post("/auth/logout", logout);

export default router;
