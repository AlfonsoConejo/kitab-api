import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  createDayOff,
  deleteDayOff,
  getDaysOffByPeriod,
  updateDayOff,
} from './days-off.controller.js';

// Conserva periodId definido por la ruta padre /api/periods/:periodId/days-off.
const router = Router({ mergeParams: true });

router.route('/')
  .get(authMiddleware, getDaysOffByPeriod)
  .post(authMiddleware, createDayOff);

router.route('/:dayOffId')
  .put(authMiddleware, updateDayOff)
  .delete(authMiddleware, deleteDayOff);

export default router;
