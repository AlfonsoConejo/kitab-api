import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { deleteSubject } from "./subjects.controller.js";

const router = Router();

router.route("/:subjectId")
   .delete(authMiddleware, deleteSubject)


export default router;