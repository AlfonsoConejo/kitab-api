import { Router } from "express";
import { register, login, me, refresh, logout, modifyActivePeriod } from "../auth/auth.controller.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.patch("/active-period", authMiddleware, modifyActivePeriod);

export default router;