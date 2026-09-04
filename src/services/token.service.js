import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateAccessToken = (userId, sessionId) => {
  return jwt.sign(
    { id: userId, sid: sessionId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Token expirado');
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }
    if (error.name === 'JsonWebTokenError') {
      const err = new Error('Token inválido');
      err.code = 'INVALID_TOKEN';
      throw err;
    }
    throw error;
  }
};
