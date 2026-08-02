import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { deleteSubject, getSubjectWithClasses, createClasses } from "./subjects.controller.js";

const router = Router();

router.route("/:subjectId")
   .delete(authMiddleware, deleteSubject)

router.route("/:subjectId/with-classes")
   .get(authMiddleware, getSubjectWithClasses)

router.route("/:subjectId/classes")
   .post(authMiddleware, createClasses)
export default router;