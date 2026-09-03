import express from 'express';
import cors from 'cors';
import { pool } from './config/db.js';
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import periodRoutes from "./modules/periods/periods.routes.js";
import subjectsRoutes from "./modules/subjects/subjects.routes.js";
import classesRoutes from "./modules/classes/classes.routes.js";

const app = express();

app.set("trust proxy", true);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check endpoints
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        status: 'unknown',
        latency: 0
      }
    },
    memory: process.memoryUsage(),
    node: process.version,
    environment: process.env.NODE_ENV
  };

  // Mesure response time
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    const end = Date.now();
    healthCheck.services.database.status = 'connected';
    healthCheck.services.database.latency = end - start;
  } catch (error) {
    healthCheck.services.database.status = 'disconnected';
    healthCheck.services.database.error = error.message;
    healthCheck.status = 'degraded';
  }

  // If db is not available, the service is not healthy.
  if (healthCheck.services.database.status === 'disconnected') {
    res.status(503).json(healthCheck);
  } else {
    res.status(200).json(healthCheck);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/periods", periodRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/classes", classesRoutes);

export default app;
