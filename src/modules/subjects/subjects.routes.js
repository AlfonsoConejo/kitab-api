import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { deleteSubject, getSubjectWithClasses, createClasses } from "./subjects.controller.js";

const router = Router();

router.route("/:subjectId")
   .delete(authMiddleware, deleteSubject)

router.route("/:subjectId/classes")
   .post(authMiddleware, createClasses)

router.route("/:subjectId/with-classes")
   .get(authMiddleware, getSubjectWithClasses)

export default router;