import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZXYtMTIzNDUifQ.z1eT4rYQ7wP8Xy_V6cE3oI9nB0uA2fLpMhKaFjGwZ_o";

/**
 * Middleware para verificar el token JWT en las peticiones protegidas
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      message: "Acceso denegado. Token no proporcionado.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Agregar datos del usuario al request
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Token inválido o expirado",
    });
  }
};

/**
 * Middleware opcional para rutas que pueden funcionar con o sin autenticación
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token inválido, pero continuamos sin autenticación
      req.user = null;
    }
  }

  next();
};
