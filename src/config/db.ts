import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

// Pool compartido de PostgreSQL para consultas y transacciones de la API.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
