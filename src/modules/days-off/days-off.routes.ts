import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  deleteDayOff,
  getDayOffById,
  updateDayOff,
} from './days-off.controller.js';

const router = Router();

router.route('/:dayOffId')
  .get(authMiddleware, getDayOffById)
  .put(authMiddleware, updateDayOff)
  .delete(authMiddleware, deleteDayOff);

export default router;
