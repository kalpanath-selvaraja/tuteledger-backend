import { Router } from "express";
import { login, getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

//Public endponits
router.post("/login", login);

// Protected Endpoints
router.get("/me", authenticate, getMe);

export default router;