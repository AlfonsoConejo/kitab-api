import { pool } from "../../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import crypto from "crypto";

// Definition of JWT cookie security
const isProduction = process.env.NODE_ENV === "production";

export const register = async (req, res) => {
  try {
    let { firstName, lastName, email, password } = req.body;

    firstName = firstName?.trim();
    lastName = lastName?.trim();
    email = email?.trim().toLowerCase();

    // Validations
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios."
      });
    }

    if (lastName.length < 2) {
      return res.status(400).json({
        message: "Last name must contain at least 2 characters"
      });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        message: "Invalid email"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe contener al menos 6 caracteres."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, first_name, last_name, email`,
      [firstName, lastName, email, hashedPassword]
    );

    res.status(201).json({
      message: "User created successfully",
      user: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: "El usuario ya existe"
      });
    }

    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

export const login = async (req, res) => {

  const client = await pool.connect();

  try {
    let { email, password } = req.body;

    email = email?.trim().toLowerCase();

    //Validations
    if (!email || !password) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios."
      });
    }

    //Verify if user exists on database
    const result = await client.query(
      `SELECT id, email, password_hash
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0){
      return res.status(401).json({message: "Usuario o contraseña incorrectos."})
    }

    const user = result.rows[0];
    
    // Comparing passwords with bcrypt
    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Usuario o contraseña incorrectos."
      });
    }

    const payload = {
      id: user.id,
      email: user.email
    }

    // Create JWT access token
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET,
      {expiresIn: "15m"}
    );

    // Create JWT refresh token
    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      {expiresIn: "7d"}
    );

    // Decode refresh token
    const decodedToken = jwt.decode(refreshToken);
    if(!decodedToken?.exp){
      throw new Error("Invalid refresh token");
    }

    // Hash refresh token
    const hashedRefreshToken = hashToken(refreshToken);

    const userAgent = req.get("User-Agent");
    const ipAddress = getClientIp(req);

    // Get user location from IP
    const location = await getLocationFromIp(ipAddress);

    await client.query("BEGIN");

    //Save Session to DB
    const sessionResult = await client.query(
    `
      INSERT INTO sessions (
        user_id,
        user_agent,
        ip_address,
        city,
        state,
        country
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        user.id,
        userAgent,
        ipAddress,
        location.city,
        location.state,
        location.country
      ]
    );

    const sessionId = sessionResult.rows[0].id;

    // Save Refresh Token to DB
    await client.query(
    `
      INSERT INTO refresh_tokens (
        session_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
    `,
      [
        sessionId,
        hashedRefreshToken,
        new Date(decodedToken.exp * 1000)
      ]
    );  

    await client.query("COMMIT");

    return res
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 15 // 15 minutes
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    })
    .status(200)
    .json({
      message: "Login exitoso",
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    res.status(500).json({
      message: "Server error",
      ...(!isProduction && {error: error.message})
    });
  } finally {
    client.release();
  }
};

export const me = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) return res.status(401).json({message: "Token obligatorio"})

    const data = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

    // Look for user in DB
    const result = await pool.query(
      `SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.active_period_id,
      a.name AS period_name,
      u.created_at,
      u.updated_at
      FROM users AS u
      LEFT JOIN academic_periods AS a
      ON u.active_period_id = a.id
      WHERE u.id = $1`,
      [data.id]
    );

    // Verify existance
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    // Get user
    const user = result.rows[0];

    return res.status(200).json({
      user
    });

  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired access token"
    });
  }
};

export const refresh = async(req, res) => {

  const client = await pool.connect();

  try{
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token no encontrado" });
    }

    // Hash refresh token
    const hashedRefreshToken = hashToken(refreshToken);

    // Verify JWT
    const refreshTokenData = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    await client.query("BEGIN");

    // Search for Refresh Tokens in DB
    const refreshTokensResult = await client.query(
      `SELECT
        rt.*,
        s.is_active,
        s.id AS session_id
      FROM refresh_tokens rt
      JOIN sessions s ON s.id = rt.session_id
      WHERE rt.token_hash = $1 
        AND s.is_active = true 
        AND rt.is_revoked = false`,
      [hashedRefreshToken]
    );

    if (refreshTokensResult.rows.length === 0){
      await client.query("ROLLBACK");
      return res.status(401).json({message: "Refresh token inválido."})
    }

    const currentRefreshToken = refreshTokensResult.rows[0];

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
      SET is_revoked = true,
          revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1
      AND is_revoked = false
      RETURNING *`,
      [hashedRefreshToken]
    );

    if (invalidateToken.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Refresh token already revoked"
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
    try {
      await client.query("ROLLBACK");
    } catch {}

    return res.status(403).json({ message: "Refresh token inválido" });
  } finally {
    client.release();
  }
}

export const logout = async (req, res) => {
  const client = await pool.connect();

  try {
    const refreshToken = req.cookies.refreshToken;

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

export const modifyActivePeriod = async (req, res) => {
  
  const {active_period_id} = req.body
  const userId = req.user.id;

  if (!active_period_id) {
    return res.status(404).json({ success: false, message: 'El ID del periodo actual es obligatorio.' });
  }

  const result = await pool.query(
      `UPDATE users
      SET active_period_id = $1
      WHERE id = $2
      `,
      [active_period_id, userId]
    );

  res.json({
    success: 'true',
    message: 'Usuario actualizado parcialmente'
  });
};

const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/"
};

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const getClientIp = (req) => {
  return req.ip.replace("::ffff:", "");
};

const getLocationFromIp = async (ipAddress) => {
  try {
    const response = await fetch(
      `https://ipapi.co/${ipAddress}/json/`
    );

    console.log("Status:", response.status);

    const data = await response.json();

    if (data.error) {
      throw new Error(data.reason);
    }

    console.log("IPAPI response:", data);

    return {
      city: data.city || null,
      state: data.region || null,
      country: data.country_name || null,
    };

  } catch (error) {
    console.error("IPAPI error:", error);

    return {
      city: null,
      state: null,
      country: null,
    };
  }
};