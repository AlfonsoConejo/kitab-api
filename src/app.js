import express from 'express';
import cors from 'cors';
import { pool } from './config/db.js';
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import periodRoutes from "./modules/periods/periods.routes.js";

const app = express();

app.set("trust proxy", true);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT version()');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error conectando a la DB' });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/periods", periodRoutes);

app.listen(3000, () => {
  console.log('Backend running on http://localhost:3000');
});