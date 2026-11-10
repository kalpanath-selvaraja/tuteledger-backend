import express from "express";

import healthRoutes from "./routes/health.routes";
import authRouter from "./routes/auth.routes"
import usersRouter from "./routes/users.routes";
import { connectDB } from "./config/db";
import { sendError } from "./utils/response";
const app = express();

app.use(express.json());


app.use( async (req, res,next) => {
    try{
        await connectDB();
    }catch{
        console.error("MongoDB connection failed");
        sendError(res, 503, "Database temporarily unavailable.");
    }
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRouter);
app.use("/api/users",  usersRouter)

export default app;