import jwt from "jsonwebtoken"

export const authMiddleware = (req, res, next) => {
  const token = req.cookies.accessToken;
  if(!token) {
    return res.status(401).json({
      message: "Acceso denegado"
    });
  }
  
  try{
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET);

      req.user = decoded;

      next();
  } catch (error) {
    return res.status(403).json({
      message: "Token inválido"
    });
  }
};