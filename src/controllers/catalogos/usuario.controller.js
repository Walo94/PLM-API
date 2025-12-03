import { UsuarioModel } from "../../models/catalogos/usuario.model.js";

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("Error en el controlador:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      message: err.message || "Ocurrió un error en el servidor.",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

/**
 * Crea un nuevo usuario.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.body.usuario) {
    return res.status(400).json({ message: "el usuario es requerido" });
  }

  if (!req.body.password) {
    return res.status(400).json({ message: "el password es requerido" });
  }

  if (!req.body.puestoId) {
    return res.status(400).json({ message: "El puesto es requerido" });
  }

  if (!req.body.permisos) {
    return res.status(400).json({ message: "Los permisos son requeridos" });
  }

  const nuevoUsuario = await UsuarioModel.create(req.body);
  res.status(201).json(nuevoUsuario);
});

/**
 * Obtiene todos los usuarios.
 */
export const getAll = asyncHandler(async (req, res) => {
  const usuarios = await UsuarioModel.getAll();
  res.status(200).json(usuarios);
});

/**
 * Actualiza un usuario por su ID.
 */
export const updateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (!req.body.usuario) {
    return res.status(400).json({ message: "el usuario es requerido" });
  }

  if (!req.body.puestoId) {
    return res.status(400).json({ message: "El puesto es requerido" });
  }

  if (!req.body.permisos) {
    return res.status(400).json({ message: "Los permisos son requeridos" });
  }

  const usuarioActualizado = await UsuarioModel.update(id, req.body);
  res.status(200).json(usuarioActualizado);
});

/**
 * Actualiza el estatus de un usuario por su ID.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  if (req.body.estatus === undefined) {
    return res.status(400).json({ message: "El estatus es requerido" });
  }

  const usuarioActualizado = await UsuarioModel.updateStatus(id, req.body);
  res.status(200).json(usuarioActualizado);
});
