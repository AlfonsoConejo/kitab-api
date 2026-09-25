import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { createSubject, getSubjectsByPeriod } from './subjects.controller.js';

// Conserva periodId definido por la ruta padre /api/periods/:periodId/subjects.
const router = Router({ mergeParams: true });

router.route('/')
  .get(authMiddleware, getSubjectsByPeriod)
  .post(authMiddleware, createSubject);

export default router;
