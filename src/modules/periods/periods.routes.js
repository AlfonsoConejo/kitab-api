import { Router } from "express";
import { newPeriod, periods, deletePeriod, updatePeriod, requestedPeriod, getSubjects } from "../periods/periods.controller.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = Router();

router.route("/")
  .post(authMiddleware, newPeriod)
  .get(authMiddleware, periods);

router.route("/:periodId")
  .delete(authMiddleware, deletePeriod)
  .put(authMiddleware, updatePeriod)
  .get(authMiddleware, requestedPeriod)

router.route("/:periodId/subjects")
  .get(authMiddleware, getSubjects);
  
export default router;