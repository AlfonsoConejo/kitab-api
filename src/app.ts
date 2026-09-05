import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { pool } from './config/db.js';
import { csrfOriginMiddleware } from './middleware/csrf-origin.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import periodRoutes from './modules/periods/periods.routes.js';
import subjectsRoutes from './modules/subjects/subjects.routes.js';

type DatabaseHealth = {
  status: 'unknown' | 'connected' | 'disconnected';
  latency: number;
  error?: string;
};

const app = express();

app.set('trust proxy', true);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api', csrfOriginMiddleware);

// Informa el estado de la API y la disponibilidad de PostgreSQL.
app.get('/health', async (_request, response) => {
  const database: DatabaseHealth = {
    status: 'unknown',
    latency: 0,
  };

  const healthCheck = {
    status: 'ok' as 'ok' | 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: { database },
    memory: process.memoryUsage(),
    node: process.version,
    environment: process.env.NODE_ENV,
  };

  const start = Date.now();

  try {
    await pool.query('SELECT 1');
    database.status = 'connected';
    database.latency = Date.now() - start;
  } catch (error) {
    database.status = 'disconnected';
    database.error = error instanceof Error ? error.message : 'Error desconocido';
    healthCheck.status = 'degraded';
  }

  return response.status(database.status === 'disconnected' ? 503 : 200).json(healthCheck);
});

app.use('/api/auth', authRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/subjects', subjectsRoutes);

export default app;
