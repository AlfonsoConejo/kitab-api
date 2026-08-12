import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { deleteSubject, getSubjectWithClasses, createClasses, updateSubject, checkConflicts } from "./subjects.controller.js";

const router = Router();

router.route("/:subjectId")
   .delete(authMiddleware, deleteSubject)
   .put(authMiddleware, updateSubject)

router.route("/:subjectId/with-classes")
   .get(authMiddleware, getSubjectWithClasses)

router.route("/:subjectId/classes")
   .post(authMiddleware, createClasses)

router.route("/:subjectId/classes/check-conflicts")
  .post(authMiddleware, checkConflicts)
export default router;