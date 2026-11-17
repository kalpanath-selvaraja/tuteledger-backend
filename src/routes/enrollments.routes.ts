import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createEnrollment, getEnrollments, updateEnrollment } from "../controllers/enrollments.controller";
import { requireTutor } from "../middleware/role.middleware";

const router = Router();

router.get("/" , authenticate, getEnrollments)

router.post("/", authenticate, createEnrollment)
router.put("/:id", authenticate, requireTutor, updateEnrollment)

export default router;