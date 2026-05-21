import { Router } from "express";
import { register, login, me, refresh } from "../auth/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", me);
router.get("/refresh", refresh);

export default router;