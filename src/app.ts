import express from "express";
import healthRoutes from "./routes/health.routes";
import authRouter from "./routes/auth.routes"
import usersRouter from "./routes/users.routes";
import { connectDB } from "./config/db";
import { sendError } from "./utils/response";
import  cors from "cors"
import { env } from "./config/env";
import classesRouter from "./routes/classes.routes";
import studentsRouter from "./routes/student.routes"

const app = express();

app.use(cors({ origin: env.corsOrigins }));
app.use(express.json());

app.use( async (_req, res,next) => {
    try{
        await connectDB();
        next();
    }catch (error){
        const details = error as { name?: string; code?: number | string; syscall?: string };
        // Keep credentials and connection strings out of the logs.
        console.error("MongoDB connection failed", {
            name: details?.name,
            code: details?.code,
            syscall: details?.syscall,
        });
        sendError(res, 503, "Database temporarily unavailable.");
    }
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRouter);
app.use("/api/users",  usersRouter)
app.use("/api/classes", classesRouter);
app.use("/api/students", studentsRouter);

export default app;