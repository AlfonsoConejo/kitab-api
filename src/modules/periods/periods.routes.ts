import { Router } from 'express';
import {
  createPeriod,
  createSubject,
  deletePeriod,
  getClassesByPeriod,
  getPeriod,
  getPeriods,
  getSubjectsByPeriod,
  updatePeriod,
} from './periods.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.route('/')
  .post(authMiddleware, createPeriod)
  .get(authMiddleware, getPeriods);

router.route('/:periodId')
  .get(authMiddleware, getPeriod)
  .put(authMiddleware, updatePeriod)
  .delete(authMiddleware, deletePeriod);

router.route('/:periodId/subjects')
  .get(authMiddleware, getSubjectsByPeriod)
  .post(authMiddleware, createSubject);
  
router.route('/:periodId/classes')
  .get(authMiddleware, getClassesByPeriod);

export default router;
