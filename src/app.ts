import express from "express";

import healthRoutes from "./routes/health.routes";
import authRouter from "./routes/auth.routes"

const app = express();

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRouter);

export default app;