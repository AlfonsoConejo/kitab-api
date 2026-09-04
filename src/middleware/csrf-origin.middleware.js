const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const normalizeOrigin = (origin) => origin.replace(/\/+$/, "");

const getAllowedOrigins = () =>
  (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

export const csrfOriginMiddleware = (req, res, next) => {
  if (!UNSAFE_METHODS.has(req.method)) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    console.error("FRONTEND_URL no est\u00e1 configurado para validar el origen CSRF");
    return res.status(500).json({
      code: "CSRF_ORIGIN_NOT_CONFIGURED",
      message: "Error interno del servidor",
    });
  }

  const requestOrigin = req.get("Origin");

  if (!requestOrigin || !allowedOrigins.includes(normalizeOrigin(requestOrigin))) {
    return res.status(403).json({
      code: "INVALID_ORIGIN",
      message: "Origen no permitido",
    });
  }

  next();
};
