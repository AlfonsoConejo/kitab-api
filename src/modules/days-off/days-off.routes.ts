import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getDaysOffByPeriod } from './days-off.controller.js';

// Conserva periodId definido por la ruta padre /api/periods/:periodId/days-off.
const router = Router({ mergeParams: true });

router.route('/')
  .get(authMiddleware, getDaysOffByPeriod);

export default router;
