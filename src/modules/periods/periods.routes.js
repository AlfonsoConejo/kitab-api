import { Router } from "express";
import { newPeriod, periods, deletePeriod, updatePeriod } from "../periods/periods.controller.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = Router();

router.route("/")
  .post(authMiddleware, newPeriod)
  .get(authMiddleware, periods);

router.route("/:id")
  .delete(authMiddleware, deletePeriod)
  .put(authMiddleware, updatePeriod);

export default router;