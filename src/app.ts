import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './docs/openapi.js';
import { pool } from './config/db.js';
import { csrfOriginMiddleware } from './middleware/csrf-origin.middleware.js';
import { getAllowedOrigins } from './shared/http/allowed-origins.js';
import authRoutes from './modules/auth/auth.routes.js';
import daysOffRoutes from './modules/days-off/days-off.routes.js';
import periodRoutes from './modules/periods/periods.routes.js';
import periodClassesRoutes from './modules/subjects/period-classes.routes.js';
import periodSubjectsRoutes from './modules/subjects/period-subjects.routes.js';
import subjectsRoutes from './modules/subjects/subjects.routes.js';


type DatabaseHealth = {
  status: 'unknown' | 'connected' | 'disconnected';
  latency: number;
  error?: string;
};

const app = express();
const allowedOrigins = getAllowedOrigins();

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Kitab API · Documentación',
    customCss: `
      :root {
        --kitab-navy: #0f172a;
        --kitab-blue: #2563eb;
        --kitab-slate: #475569;
        --kitab-surface: #f8fafc;
        --kitab-border: #e2e8f0;
      }

      body {
        background: var(--kitab-surface);
      }

      .swagger-ui {
        color: var(--kitab-navy);
      }

      .swagger-ui .topbar {
        background: var(--kitab-navy);
        box-shadow: 0 2px 12px rgba(15, 23, 42, .2);
        padding: 14px 0;
      }

      .swagger-ui .topbar-wrapper {
        align-items: center;
        max-width: 1200px;
      }

      .swagger-ui .topbar-wrapper > a,
      .swagger-ui .topbar .download-url-wrapper {
        display: none;
      }

      .swagger-ui .topbar-wrapper::before {
        color: #fff;
        content: 'Kitab API';
        font-family: sans-serif;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -.02em;
      }

      .swagger-ui .info {
        margin: 42px 0 28px;
      }

      .swagger-ui .info .title {
        color: var(--kitab-navy);
        font-size: 32px;
      }

      .swagger-ui .info .title small.version-stamp {
        background: var(--kitab-blue);
      }

      .swagger-ui .info p,
      .swagger-ui .info li {
        color: var(--kitab-slate);
      }

      .swagger-ui .scheme-container {
        background: transparent !important;
        border: 0 !important;
        border-radius: 10px;
        box-shadow: none !important;
        outline: 0 !important;
      }

      .swagger-ui .opblock-tag {
        border-bottom-color: var(--kitab-border);
        color: var(--kitab-navy);
        font-size: 18px;
      }

      .swagger-ui .opblock {
        border-radius: 10px;
        box-shadow: none;
      }

      .swagger-ui .opblock.opblock-post {
        border-color: #16a34a;
        background: rgba(22, 163, 74, .06);
      }

      .swagger-ui .opblock.opblock-post .opblock-summary-method {
        background: #16a34a;
      }

      .swagger-ui .btn.execute {
        background: var(--kitab-blue);
        border-color: var(--kitab-blue);
        border-radius: 6px;
      }

      .swagger-ui .btn.authorize {
        border-color: var(--kitab-blue);
        border-radius: 6px;
        color: var(--kitab-blue);
      }

      .swagger-ui input[type=text],
      .swagger-ui textarea,
      .swagger-ui select {
        border-color: #cbd5e1;
        border-radius: 6px;
      }
    `,
  }),
);

app.set('trust proxy', true);

app.use(cors({
  origin: allowedOrigins,
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
app.use('/api/periods/:periodId/days-off', daysOffRoutes);
app.use('/api/periods/:periodId/classes', periodClassesRoutes);
app.use('/api/periods/:periodId/subjects', periodSubjectsRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/subjects', subjectsRoutes);

export default app;
