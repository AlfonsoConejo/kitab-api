import { pool } from "../../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

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
    const result = await pool.query(
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

    // Hash refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Decode refresh token
    const decodedRefreshToken = jwt.decode(refreshToken);
    if(!decodedRefreshToken?.exp){
      throw new Error("Invalid refresh token");
    }

    const userAgent = req.get("User-Agent");
    const ipAddress = req.ip;

    //Save refresh token to DB
    await pool.query(
      `INSERT INTO sessions (user_id, refresh_token, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id,refresh_token, expires_at`,
      [
        user.id,
        hashedRefreshToken,
        new Date(decodedRefreshToken.exp * 1000),
        userAgent,
        ipAddress
      ]
    );

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
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

export const me = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) return res.status(401).json({message: "Token obligatorio"})

    const data = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

    return res.status(200).json({
      user: {
        id: data.id,
        email: data.email
      }
    });

  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired access token"
    });
  }
};

export const refresh = async(req, res) => {
  try{
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token no encontrado" });
    }

    // Verify user id
    const refreshTokenData = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // Search user sessions in DB
    const sessions = await pool.query(
      `SELECT *
      FROM sessions
      WHERE user_id = $1
      AND is_revoked = false`,
      [refreshTokenData.id]
    );

    const matchedSession = sessions.rows.find(session =>
      bcrypt.compareSync(refreshToken, session.refresh_token)
    );

    if (!matchedSession) {
      return res.status(403).json({
        message: "Refresh token inválido"
      });
    }

    if (matchedSession.expires_at < new Date()) {
      return res.status(401).json({
        message: "Refresh token inválido"
      });
    }

    //Invalidate previous refresh token
    const invalidateToken = await pool.query(
      `UPDATE sessions
      SET is_revoked = true
      WHERE id = $1
      AND is_revoked = false
      RETURNING *`,
      [matchedSession.id]
    );

    if (invalidateToken.rowCount === 0) {
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

    // Decode refresh token
    const decodedNewRefreshToken = jwt.decode(newRefreshToken);

    if (!decodedNewRefreshToken?.exp) {
      throw new Error("Invalid refresh token");
    }

    //Hash refresh token
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    const userAgent = req.get("User-Agent");
    const ipAddress = req.ip;

    // Store new refreshToken to DB
    await pool.query(
      `INSERT INTO sessions (user_id, refresh_token, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id,refresh_token, expires_at`,
      [refreshTokenData.id, hashedNewRefreshToken , new Date(decodedNewRefreshToken.exp * 1000), userAgent, ipAddress]
    );

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
    return res.status(403).json({ message: "Refresh token inválido" });
  }
}

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "No refresh token"
      });
    }

    // Clear cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      path: "/"
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      path: "/"
    });

    // Verify refresh token
    const refreshTokenData = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // Search user sessions in DB
    const sessions = await pool.query(
      `SELECT *
      FROM sessions
      WHERE user_id = $1
      AND is_revoked = false`,
      [refreshTokenData.id]
    );

    const matchedSession = sessions.rows.find(session =>
      bcrypt.compareSync(refreshToken, session.refresh_token)
    );

    if (!matchedSession) {
      return res.status(403).json({
        message: "Refresh token inválido"
      });
    }

    // Revoke refresh token
    await pool.query(
      `UPDATE sessions
       SET is_revoked = true
       WHERE id = $1
       AND is_revoked = false`,
      [matchedSession.id]
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid refresh token"
    });
  }
};