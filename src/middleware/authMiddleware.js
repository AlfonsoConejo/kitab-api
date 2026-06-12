import jwt from "jsonwebtoken"

export const authMiddleware = (req, res, next) => {
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

    req.user = decoded;

    next();
  } catch (error) {

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        code: "ACCESS_TOKEN_EXPIRED",
        message: "Access token expired"
      });
    }

    return res.status(403).json({
      code: "INVALID_ACCESS_TOKEN",
      message: "Token inválido"
    });
  }
};