import { Router } from "express";
import { createClasses} from "../classes/classes.controller.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = Router();

router.route("/:subjectId")
  .post(authMiddleware, createClasses)
  
export default router;