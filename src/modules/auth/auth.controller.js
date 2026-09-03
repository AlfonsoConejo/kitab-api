import { pool } from "../../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import crypto from "crypto";
import { hashToken } from "../../services/token.service.js";
import { normalizeAndValidateUser, normalizeUserToDB, normalizeUserFromDB, normalizeUsersFromDB } from "../../validators/auth.validator.js";
import { insertUser, findUserByEmail, findUserById } from "../../services/user.service.js"; 
import { loginUser } from "../../services/auth.service.js";
import { createRefreshToken, verifyRefreshToken, findRefreshTokenByToken, revokeRefreshToken, getUserIdFromRefreshToken, revokeAllUserRefreshTokens  } from "../../services/refreshToken.service.js";
import { generateAccessToken, generateRefreshToken } from "../../services/token.service.js";
import { deactivateSession, deactivateAllUserSessions } from "../../services/session.service.js";

// Definition of JWT cookie security
const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/'
};
const accessTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000
};
const refreshTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export const register = async (req, res) => {

  let client;

  try {
    client = await pool.connect();

    // Normalize and validate user input
    const normalizedUser = normalizeAndValidateUser(req.body);

    const existingUser = await findUserByEmail(normalizedUser.email, client); 
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "El usuario ya existe"
      });
    }   
    
    const hashedPassword = await bcrypt.hash(normalizedUser.password, 10);

    const result = await insertUser({ ...normalizedUser, password_hash: hashedPassword }, client);

    const userForFrontend = normalizeUserFromDB(result);

    return res.status(201).json({
      success: true,
      message: "Usuario creado correctamente",
      user: userForFrontend
    });

  } catch (error) {
    console.error("Error on register:", error);

    // Validation error
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    // Unique constraint violation (user already exists)
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: "El usuario ya existe"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};

export const login = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password } = req.body;

    // Validation: Check if email and password are provided
    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    await client.query('BEGIN');

    // Login user and create session
    const { user, session, tokens } = await loginUser(
      email.trim().toLowerCase(),
      password,
      req,
      client
    );

    await client.query('COMMIT');

    // Normalize user data for frontend
    const userForFrontend = normalizeUserFromDB(user);

    // Set cookies with appropriate security settings
    res.cookie('accessToken', tokens.accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', tokens.refreshToken, refreshTokenCookieOptions);

    // Return response with user and session data
    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userForFrontend,
        session: {
          id: session.id
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Error en login: ', error);

    // Handle specific error cases
    if (error.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });

  } finally {
    client.release();
  }
};

export const me = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const userForFrontend = normalizeUserFromDB(user);

    return res.status(200).json({
      success: true,
      data: {
        user: userForFrontend
      }
    });

  } catch (error) {
    console.error('Error en /me:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token requerido'
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Verify refresh token (not JWT)
    const tokenData = await verifyRefreshToken(refreshToken, client);

    // Generate new tokens
    const newAccessToken = generateAccessToken(tokenData.userId);
    const newRefreshToken = generateRefreshToken();

    // Store new refresh token
    await createRefreshToken(tokenData.sessionId, newRefreshToken, client);

    await client.query('COMMIT');

    // Update cookies with new tokens
    res.cookie('accessToken', newAccessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Token renovado exitosamente'
    });

  } catch (error) {
    // A reused token revokes its session before throwing. Commit that security
    // action; other failures must discard the transaction as usual.
    if (client) {
      if (error.code === 'REFRESH_TOKEN_ALREADY_USED') {
        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
      }
    }
    console.error('Error en refresh:', error);

    if (error.code === 'REFRESH_TOKEN_NOT_FOUND' ||
        error.code === 'REFRESH_TOKEN_EXPIRED' ||
        error.code === 'REFRESH_TOKEN_REVOKED' ||
        error.code === 'SESSION_INACTIVE' ||
        error.code === 'REFRESH_TOKEN_ALREADY_USED') {
      
      // Limpiar cookies en caso de error
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
      
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};

export const logout = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  // If no refresh token is provided, clear cookies and return success
  if (!refreshToken) {
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Search for the refresh token in the database
    const tokenData = await findRefreshTokenByToken(refreshToken, client);

    // If the token is not found, clear cookies and return success
    if (!tokenData) {
      await client.query('COMMIT');
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
      return res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    }

    // Verify that the user making the request is the owner of the session
    if (req.user && tokenData.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'No autorizado para cerrar esta sesión.'
      });
    }

    // Revoke the refresh token (mark as revoked)
    const revokedToken = await revokeRefreshToken(
      hashToken(refreshToken),
      client
    );

    if (!revokedToken) {
      await client.query('ROLLBACK');
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
      return res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    }

    // Deactivate the session associated with the revoked refresh token
    await deactivateSession(tokenData.session_id, client);

    await client.query('COMMIT');

    // Clear cookies on the client side
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    
    try {
      await client.query('ROLLBACK');
    } catch {}

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión'
    });

  } finally {
    client.release();
  }
};

export const logoutAll = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  // If no token is provided, clear cookies and respond with success
  if (!refreshToken) {
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    return res.status(200).json({
      success: true,
      message: 'Todas las sesiones cerradas exitosamente'
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Get user ID from the provided refresh token
    const userId = await getUserIdFromRefreshToken(refreshToken, client);

    // If the token is invalid or not found, clear cookies and return success
    if (!userId) {
      await client.query('COMMIT');
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
      return res.status(200).json({
        success: true,
        message: 'Todas las sesiones cerradas exitosamente'
      });
    }

    // Verify that the user making the request is the owner of the sessions
    if (req.user && userId !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'No autorizado para cerrar estas sesiones'
      });
    }

    // Deactivate all sessions for the user
    const deactivatedSessions = await deactivateAllUserSessions(userId, client);
    console.log(`Sesiones desactivadas: ${deactivatedSessions.length}`);

    // Revoke all refresh tokens for the user
    const revokedTokens = await revokeAllUserRefreshTokens(userId, client);
    console.log(`Refresh tokens revocados: ${revokedTokens.length}`);

    await client.query('COMMIT');

    // Clear cookies on the client side
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(200).json({
      success: true,
      message: `Se cerraron ${deactivatedSessions.length} sesiones correctamente`
    });

  } catch (error) {
    console.error('Error en logoutAll:', error);

    try {
      await client.query('ROLLBACK');
    } catch {}

    // Verify if the API returned an error
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(500).json({
      success: false,
      message: 'Error al cerrar todas las sesiones'
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};

