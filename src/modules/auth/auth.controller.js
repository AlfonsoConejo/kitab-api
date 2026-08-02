import { pool } from "../../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import crypto from "crypto";
import { normalizeAndValidateUser, normalizeUserToDB, normalizeUserFromDB, normalizeUsersFromDB } from "../../validators/auth.validator.js";
import { insertUser, findUserByEmail, findUserById } from "../../services/user.service.js"; 
import { loginUser } from "../../services/auth.service.js";
import { verifyAccessToken } from "../../services/token.service.js";

// Definition of JWT cookie security
const isProduction = process.env.NODE_ENV === "production";

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
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

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
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(accessToken);
    } catch (error) {
      if (error.code === 'TOKEN_EXPIRED') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Por favor, inicia sesión nuevamente.'
        });
      }
      
      if (error.code === 'INVALID_TOKEN') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Error de autenticación'
      });
    }

    const user = await findUserById(decoded.id);

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

export const refresh = async(req, res) => {

  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "No autorizado" });
  }

  // Hash refresh token
  const hashedRefreshToken = hashToken(refreshToken);

  let client;

  try{
    // Verify JWT
    const refreshTokenData = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    client = await pool.connect();
    
    await client.query("BEGIN");

    // Search for Refresh Tokens in DB
    const refreshTokensResult = await client.query(
      `SELECT
        rt.*,
        s.user_id,
        s.is_active,
        s.id AS session_id
      FROM refresh_tokens rt
      JOIN sessions s
        ON s.id = rt.session_id
      WHERE rt.token_hash = $1
      FOR UPDATE;`,
      [hashedRefreshToken]
    );

    if (refreshTokensResult.rows.length === 0){
      await client.query("ROLLBACK");
      return res.status(401).json({message: "Refresh token inválido."})
    }

    const currentRefreshToken = refreshTokensResult.rows[0];

    if (currentRefreshToken.is_used) {

      const userId = currentRefreshToken.user_id;
      console.warn(`[ALERTA DE SEGURIDAD] ¡Intento de reutilización de refresh token para el usuario ${userId}!`);

      // Inactivate all sessions for that user
      await client.query(
        `UPDATE sessions 
        SET is_active = false 
        WHERE user_id = $1`,
        [userId]
      );

      // Revoke all refresh tokens for that user
      await client.query(
        `UPDATE refresh_tokens
        SET
            is_revoked = true,
            is_used = true,
            revoked_at = CURRENT_TIMESTAMP
        WHERE session_id IN (
            SELECT id
            FROM sessions
            WHERE user_id = $1
        );`,
        [userId]
      );

      await client.query("COMMIT");

      return res.status(401).json({message: "Token inválido o reutilizado. Inicie sesión de nuevo."})
    }

    if (currentRefreshToken.is_revoked) {
      // Token revocado (logout, cambio de contraseña, etc.)
      await client.query("ROLLBACK");
      return res.status(401).json({
          message: "Refresh token inválido"
      });
    }

    if (!currentRefreshToken.is_active) {
      await client.query("ROLLBACK");
      return res.status(401).json({
        message: "Sesión inválida."
      });
    }

    if (refreshTokenData.id !== currentRefreshToken.user_id) {
      await client.query("ROLLBACK");

      return res.status(401).json({
        message: "Refresh token inválido"
      });
    }

    // It token has already expired
    if (currentRefreshToken.expires_at < new Date()) {
      await client.query("ROLLBACK");
      return res.status(401).json({
        message: "Refresh token inválido"
      });
    }

    // Invalidate previous refresh token
    const invalidateToken = await client.query(
      `UPDATE refresh_tokens
      SET
          is_revoked = true,
          is_used = true,
          revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1
        AND is_used = false
        AND is_revoked = false
      RETURNING *;`,
      [hashedRefreshToken]
    );

    if (invalidateToken.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Refresh token inválido"
      });
    }

    const payload = {
      id: refreshTokenData.id,
      email: refreshTokenData.email
    }

    // Create new JWT refresh token
    const newRefreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      {expiresIn: "7d"}
    );

    const refreshExpiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 7
    );

    // Hash refresh token
    const hashedNewRefreshToken = hashToken(newRefreshToken);

    // Store new refreshToken to DB
    await client.query(
      `INSERT INTO refresh_tokens (session_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
      `,
      [currentRefreshToken.session_id, hashedNewRefreshToken , refreshExpiresAt]
    );

    // Update session last_seen_at field
    await client.query(
      `UPDATE sessions
       SET last_seen_at = CURRENT_TIMESTAMP
       WHERE id = $1
      `,
      [currentRefreshToken.session_id]
    );

    await client.query("COMMIT");

    // Create JWT access token
    const newAccessToken = jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET,
      {expiresIn: "15m"}
    );

    return res
    .cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 15 // 15 minutes
    })
    .cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7
    })
    .json({ ok: true });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {}
    }

    return res.status(403).json({
      message: "Refresh token inválido"
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const client = await pool.connect();

  try {

    if (!refreshToken) {
      return res.status(200).json({ ok: true });
    }

    const hashedRefreshToken = hashToken(refreshToken);

    const refreshTokenInfoResult = await client.query(
      `SELECT session_id
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [hashedRefreshToken]
    );

    if (refreshTokenInfoResult.rows.length === 0) {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);
      return res.json({ ok: true });
    }

    const { session_id } = refreshTokenInfoResult.rows[0];

    await client.query("BEGIN");

    await client.query(
      `UPDATE sessions
       SET is_active = false
       WHERE id = $1`,
      [session_id]
    );

    await client.query(
      `UPDATE refresh_tokens
       SET is_revoked = true,
           revoked_at = CURRENT_TIMESTAMP
       WHERE session_id = $1`,
      [session_id]
    );

    await client.query("COMMIT");

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    return res.json({ ok: true });

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    return res.status(500).json({ message: "Logout error" });
  } finally {
    client.release();
  }
};

export const logoutAll = async (req, res) => {
  
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(200).json({ ok: true });
  }

  const hashedRefreshToken = hashToken(refreshToken);

  let client;
  try {
    client = await pool.connect();

    await client.query("BEGIN");
    
    // Get user_id from refresh token
    const tokenResult = await client.query(
      `SELECT s.user_id
      FROM refresh_tokens rt
      JOIN sessions s ON s.id = rt.session_id
      WHERE rt.token_hash = $1
        AND rt.is_revoked = false`,
      [hashedRefreshToken]
    );

    // If token is not found, clear cookies and return success
    if (tokenResult.rows.length === 0) {
      await client.query("COMMIT"); // Cerramos transacción limpia
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);
      return res.json({ ok: true });
    }

    const userId = tokenResult.rows[0].user_id;

    // Inactivate all sessions for that user
    await client.query(
      `UPDATE sessions 
      SET is_active = false
      WHERE user_id = $1`,
      [userId]
    );

    // Revoke all refresh tokens for that user
    await client.query(
      `UPDATE refresh_tokens
      SET
          is_revoked = true,
          is_used = true,
          revoked_at = CURRENT_TIMESTAMP
      WHERE session_id IN (
          SELECT id
          FROM sessions
          WHERE user_id = $1
      );`,
      [userId]
    );

    await client.query("COMMIT");

    // Clear cookies on the client side
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    return res.json({ ok: true });

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("Error en logoutAll:", error);
    return res.status(500).json({ message: "Error al cerrar todas las sesiones" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/"
};