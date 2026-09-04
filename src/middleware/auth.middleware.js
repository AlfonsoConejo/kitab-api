import jwt from "jsonwebtoken"
import { touchSession } from "../services/session.service.js";

export const authMiddleware = async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({
      code: "NO_ACCESS_TOKEN",
      message: "Acceso denegado"
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    if (!Number.isInteger(decoded.sid)) {
      return res.status(401).json({
        code: "INVALID_SESSION_TOKEN",
        message: "Token de sesión inválido"
      });
    }

    let session;

    try {
      session = await touchSession(decoded.sid, decoded.id);
    } catch (error) {
      console.error("Error actualizando la sesión:", error);
      return res.status(500).json({
        code: "SESSION_UPDATE_FAILED",
        message: "Error interno del servidor"
      });
    }

    if (!session) {
      return res.status(401).json({
        code: "SESSION_INACTIVE",
        message: "Sesión inactiva"
      });
    }

    req.user = decoded;

    next();
  } catch (error) {

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        code: "ACCESS_TOKEN_EXPIRED",
        message: "Access token expired"
      });
    }

    return res.status(401).json({
      code: "INVALID_ACCESS_TOKEN",
      message: "Token inválido"
    });
  }
};
