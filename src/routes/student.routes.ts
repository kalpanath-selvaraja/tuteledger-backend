import { Router } from "express";
import { createStudent, getStudents, getStudentById, updateStudent } from "../controllers/students.controller"

import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, getStudents);
router.get("/:id", authenticate, getStudentById);

router.post("/", authenticate, createStudent);
router.put("/:id", authenticate, updateStudent);

export default router;