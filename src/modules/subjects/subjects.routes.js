import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { deleteSubject, getSubjectWithClasses, createClasses, updateSubject, checkExternalConflicts, checkInternalConflicts } from "./subjects.controller.js";

const router = Router();

router.route("/:subjectId")
   .delete(authMiddleware, deleteSubject)
   .put(authMiddleware, updateSubject);

router.route("/:subjectId/with-classes")
   .get(authMiddleware, getSubjectWithClasses);

router.route("/:subjectId/classes")
   .post(authMiddleware, createClasses);

router.route("/:subjectId/classes/check-external-conflicts")
  .post(authMiddleware, checkExternalConflicts);

router.route("/:subjectId/classes/check-internal-conflicts")
  .post(authMiddleware, checkInternalConflicts);
export default router;