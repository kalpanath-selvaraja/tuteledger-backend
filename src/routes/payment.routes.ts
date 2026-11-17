import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createPayment, getPayments, voidPayment } from "../controllers/payment.controller";
import { requireTutor } from "../middleware/role.middleware";

const router = Router();

router.get("/", authenticate, getPayments);
router.post("/", authenticate, createPayment)
router.put("/:id/void", authenticate, requireTutor, voidPayment)


export default router;