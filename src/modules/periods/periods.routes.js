import { Router } from "express";
import { createPeriod, getPeriods, getPeriod, updatePeriod, deletePeriod, getPeriodSubjects, createSubject } from "../periods/periods.controller.js";
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
  
export default router;