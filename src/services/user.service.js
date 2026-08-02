import { pool } from "../config/db.js";

export const findUserByEmail = async (email, client = pool) => {
  const db = client || pool;

  // Normalize email to lowercase and trim whitespace
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const result = await db.query(
    `SELECT 
      id, 
      first_name, 
      last_name, 
      email, 
      password_hash, 
      created_at, 
      updated_at
    FROM users
    WHERE email = $1`,
    [normalizedEmail]
  );

  return result.rows[0] || null;
};

export const insertUser = async (user, client = pool) => {
  const { first_name, last_name, email, password_hash } = user;

  const db = client || pool;

  const result = await db.query(
    `INSERT INTO users (first_name, last_name, email, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING id, first_name, last_name, email, created_at, updated_at`,
    [first_name, last_name, email, password_hash]
  );

  return result.rows[0];
};

export const findUserById = async (userId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `SELECT 
      id, 
      first_name, 
      last_name, 
      email, 
      created_at, 
      updated_at
    FROM users
    WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
};

export const updateUser = async (id, data) => { something }