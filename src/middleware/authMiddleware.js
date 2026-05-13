import jwt from "jsonwebtoken"

export const authMiddlaware = (req, res, next) => {
  const authHeader = req.cookies.token;
  if(!authHeader) {
    return res.status(401).json({
      message: "Acceso denegado"
    });
  }

  const token = authHeader.split(" ")[1];
  
  jwt.verify(
    token,
    process.env.JWT_SECRET,
    (error, decoded) => {
      if (error) {
        return res.status(403).json({
          message: "Token inválido"
        });
      }

      req.user = decoded;

      next();
    }
  );
};