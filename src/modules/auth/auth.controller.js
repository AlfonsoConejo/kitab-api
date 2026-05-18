import { pool } from "../../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

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

    if (password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe contener al menos 6 caracteres."
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

    // Create JWT
    const payload = {id: user.id, email: user.email}
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {expiresIn: "15m"}
    );

    return res
    .cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 15
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
    const token = req.cookies.token;

    if (!token) return res.status(401).json({message: "Token obligatorio"})

    const data = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({user: data});
  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};