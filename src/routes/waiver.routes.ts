import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireTutor } from "../middleware/role.middleware";
import { createWaiver } from "../controllers/payment.controller";

const router = Router();

router.post("/", authenticate, requireTutor, createWaiver);

export default router;