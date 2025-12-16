import { AuthModel } from "../../models/auth/auth.model.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZXYtMTIzNDUifQ.z1eT4rYQ7wP8Xy_V6cE3oI9nB0uA2fLpMhKaFjGwZ_o";
const JWT_EXPIRES_IN = "8h";

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error en el controlador de autenticación:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      message: err.message || "Ocurrió un error en el servidor.",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

/**
 * Inicia sesión de un usuario
 */
export const login = asyncHandler(async (req, res) => {
  const { usuario, password } = req.body;

  // Validaciones
  if (!usuario || !password) {
    return res.status(400).json({
      message: "Usuario y contraseña son requeridos",
    });
  }

  // Buscar usuario y validar credenciales
  const persona = await AuthModel.authenticate(usuario, password);

  if (!persona) {
    return res.status(401).json({
      message: "Credenciales inválidas",
    });
  }

  // Verificar que el usuario esté activo
  if (persona.estatus !== 1) {
    return res.status(403).json({
      message: "Usuario inactivo. Contacte al administrador.",
    });
  }

  // Generar token JWT
  const token = jwt.sign(
    {
      id: persona.id,
      usuario: persona.usuario,
      puestoId: persona.puestoId,
      puestoNombre: persona.puestoNombre,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Remover password de la respuesta
  const { password: _, ...personaSinPassword } = persona;

  // Enviar respuesta
  res.status(200).json({
    message: "Inicio de sesión exitoso",
    token,
    user: personaSinPassword,
  });
});

/**
 * Verifica el token y devuelve los datos del usuario
 */
export const verifyToken = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      message: "Token no proporcionado",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Obtener datos actualizados del usuario
    const persona = await AuthModel.getUserById(decoded.id);

    if (!persona || persona.estatus !== 1) {
      return res.status(401).json({
        message: "Usuario no válido o inactivo",
      });
    }

    const { password: _, ...personaSinPassword } = persona;

    res.status(200).json({
      valid: true,
      user: personaSinPassword,
    });
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
});

/**
 * Cierra la sesión del usuario (opcional - principalmente del lado del cliente)
 */
export const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "Sesión cerrada exitosamente",
  });
});

/**
 * Cambia la contraseña de un usuario
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  // Validaciones
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({
      message: "Todos los campos son requeridos",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      message: "La nueva contraseña debe tener al menos 6 caracteres",
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: "La nueva contraseña debe ser diferente a la actual",
    });
  }

  try {
    await AuthModel.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    if (error.message === "La contraseña actual es incorrecta") {
      return res.status(401).json({
        message: error.message,
      });
    }
    throw error;
  }
});
