import { Router } from "express";
import { getSubjects } from "../subjects/subjects.controller.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = Router();


export default router;