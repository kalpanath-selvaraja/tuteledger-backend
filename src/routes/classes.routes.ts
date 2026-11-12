import { Router } from "express";
import { createClass,getClasses, getClassById, updateClass, } from "../controllers/classes.controller";

import { authenticate } from "../middleware/auth.middleware";
import { requireTutor } from "../middleware/role.middleware";

const router = Router();

router.get("/", authenticate, getClasses);
router.get("/:id", authenticate, getClassById);

router.post("/", authenticate, requireTutor, createClass);
router.put("/:id", authenticate, requireTutor, updateClass);

export default router;