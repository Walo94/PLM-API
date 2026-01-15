import path from "path";
import fs from "fs";

// Ruta del archivo PDF de documentación
const DOCUMENTACION_PATH = "C:/PLM_Data/DocumentacionPLM.pdf";

// Función auxiliar para manejar errores asíncronos en Express
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
 * Sirve el archivo PDF de documentación
 */
export const getDocumentacionPDF = asyncHandler(async (req, res) => {
  // Verificar si el archivo existe físicamente
  if (!fs.existsSync(DOCUMENTACION_PATH)) {
    return res.status(404).json({
      message: "El archivo de documentación no se encontró en el servidor.",
    });
  }

  // Obtener información del archivo
  const stat = fs.statSync(DOCUMENTACION_PATH);
  const fileSize = stat.size;

  // Configurar headers para PDF
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", fileSize);
  res.setHeader(
    "Content-Disposition",
    'inline; filename="DocumentacionPLM.pdf"'
  );

  // Crear stream de lectura y enviarlo
  const readStream = fs.createReadStream(DOCUMENTACION_PATH);
  readStream.pipe(res);
});

/**
 * Descarga el archivo PDF de documentación
 */
export const downloadDocumentacionPDF = asyncHandler(async (req, res) => {
  // Verificar si el archivo existe físicamente
  if (!fs.existsSync(DOCUMENTACION_PATH)) {
    return res.status(404).json({
      message: "El archivo de documentación no se encontró en el servidor.",
    });
  }

  // Descargar el archivo
  res.download(DOCUMENTACION_PATH, "DocumentacionPLM.pdf", (err) => {
    if (err) {
      console.error("Error al descargar el archivo:", err);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Error al procesar la descarga del archivo.",
        });
      }
    }
  });
});
