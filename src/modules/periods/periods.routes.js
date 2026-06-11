import { Router } from "express";
import { newPeriod } from "../periods/periods.controller.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = Router();

router.post("/", authMiddleware, newPeriod);

export default router;