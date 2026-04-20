import { pool } from "../../config/db.js";
import bcrypt from "bcrypt";


export const register = async (req, res) => {
    try{
        const { firstName, lastName, email, password } = req.body;

        // Validación
        if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
            message: "Todos los campos son obligatorios"
        });
        }

        // Verificar si ya existe
        const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
        );

        if (existingUser.rows.length > 0) {
        return res.status(409).json({
            message: "El usuario ya existe"
        });
        }

        // Hash de contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario
        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, email, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING id, first_name, last_name, email, password_hash`,
            [firstName, lastName, email, hashedPassword]
        );

        const user = result.rows[0];

        // 5. Respuesta
            res.status(201).json({
            message: "Usuario creado correctamente",
            user
        });

    } catch (error) {
    res.status(500).json({
      message: "Error en el servidor",
      error: error.message
    });
  }
};