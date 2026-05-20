import { Router } from "express";
import { register, login, me } from "../auth/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", me);

export default router;