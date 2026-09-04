import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  checkExternalConflicts,
  checkInternalConflicts,
  createClasses,
  deleteSubject,
  getSubjectWithClasses,
  updateSubject,
} from './subjects.controller.js';

const router = Router();

router.route('/:subjectId')
  .delete(authMiddleware, deleteSubject)
  .put(authMiddleware, updateSubject);

router.route('/:subjectId/with-classes')
  .get(authMiddleware, getSubjectWithClasses);

router.route('/:subjectId/classes')
  .post(authMiddleware, createClasses);

router.route('/classes/check-external-conflicts')
  .post(authMiddleware, checkExternalConflicts);

router.route('/classes/check-internal-conflicts')
  .post(authMiddleware, checkInternalConflicts);

export default router;
