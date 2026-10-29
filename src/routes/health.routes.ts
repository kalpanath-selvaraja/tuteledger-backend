import { Router , Request , Response } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
    // res.status(200).json({success: true, data})
    res.status(200).json({ success: true, data: { status: "ok", dbState: mongoose.connection.readyState } });
});

export default router;