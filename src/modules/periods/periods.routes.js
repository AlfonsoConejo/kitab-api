import { Router } from "express";
import { createPeriod, getPeriods, getPeriod, updatePeriod, deletePeriod, getPeriodSubjects, createSubject, getClasses } from "../periods/periods.controller.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = Router();

router.route("/")
  .post(authMiddleware, createPeriod)
  .get(authMiddleware, getPeriods);

router.route("/:periodId")
  .get(authMiddleware, getPeriod)
  .put(authMiddleware, updatePeriod)
  .delete(authMiddleware, deletePeriod)
  
router.route("/:periodId/subjects")
  .get(authMiddleware, getPeriodSubjects)
  .post(authMiddleware, createSubject)

router.route("/:periodId/classes")
  .get(authMiddleware, getClasses)
  
export default router;