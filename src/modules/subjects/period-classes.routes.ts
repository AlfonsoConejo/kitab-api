import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getClassesByPeriod } from './subjects.controller.js';

// Conserva periodId definido por la ruta padre /api/periods/:periodId/classes.
const router = Router({ mergeParams: true });

router.get('/', authMiddleware, getClassesByPeriod);

export default router;
