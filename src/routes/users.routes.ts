import { Router } from "express";
import { createUser } from "../controllers/users.controller";

import { authenticate } from "../middleware/auth.middleware";
import  {requireTutor}   from "../middleware/role.middleware";

const router = Router();

// create Receptionist User
router.post("/", authenticate, requireTutor, createUser);

export default router;