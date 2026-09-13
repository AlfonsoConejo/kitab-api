import dotenv from 'dotenv';
import { Pool } from 'pg';

const isIntegrationTest = process.env.KITAB_INTEGRATION_TESTS === 'true';

// La configuración de Vitest marca la integración antes de importar la aplicación.
dotenv.config({
  path: isIntegrationTest ? '.env.test' : '.env',
  override: isIntegrationTest,
});

if (isIntegrationTest && process.env.DATABASE_ENV !== 'test') {
  throw new Error(
    'Las pruebas de integración requieren DATABASE_ENV=test en .env.test.',
  );
}

if (isIntegrationTest && !process.env.DATABASE_URL) {
  throw new Error(
    'Las pruebas de integración requieren DATABASE_URL en .env.test.',
  );
}

// Pool compartido de PostgreSQL para consultas y transacciones de la API.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
