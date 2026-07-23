import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { deleteSubject, getSubjectWithClasses, createClasses } from "./subjects.controller.js";

const router = Router();

router.route("/:subjectId")
   .post(authMiddleware, createClasses)
   .delete(authMiddleware, deleteSubject)

router.route("/:subjectId/with-classes")
   .get(authMiddleware, getSubjectWithClasses)

export default router;