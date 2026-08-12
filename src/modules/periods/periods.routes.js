import { Router } from "express";
import { createPeriod, getPeriods, getPeriod, updatePeriod, deletePeriod, getSubjectsByPeriod, createSubject, getClassesByPeriod } from "../periods/periods.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

router.route("/")
  .post(authMiddleware, createPeriod)
  .get(authMiddleware, getPeriods);

router.route("/:periodId")
  .get(authMiddleware, getPeriod)
  .put(authMiddleware, updatePeriod)
  .delete(authMiddleware, deletePeriod)
  
router.route("/:periodId/subjects")
  .get(authMiddleware, getSubjectsByPeriod)
  .post(authMiddleware, createSubject)

router.route("/:periodId/classes")
  .get(authMiddleware, getClassesByPeriod)


  
export default router;