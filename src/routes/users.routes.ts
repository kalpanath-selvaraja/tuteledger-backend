import { Router } from "express";
import { createUser, getUsers, updateUser } from "../controllers/users.controller";

import { authenticate } from "../middleware/auth.middleware";
import  {requireTutor}   from "../middleware/role.middleware";

const router = Router();

// create Receptionist User
router.post("/", authenticate, requireTutor, createUser);


router.get("/", authenticate, requireTutor, getUsers);
router.put("/:id", authenticate, requireTutor, updateUser);

export default router;
