import { Router } from "express";
import {
  login,
  verifyToken,
  logout,
  changePassword,
} from "../../controllers/auth/auth.controller.js";

const router = Router();

// Ruta para iniciar sesión
router.post("/auth/login", login);

// Ruta para verificar token
router.get("/auth/verify", verifyToken);

// Ruta para cerrar sesión
router.post("/auth/logout", logout);

// Ruta para cambiar contraseña
router.post("/auth/change-password", changePassword);

export default router;
