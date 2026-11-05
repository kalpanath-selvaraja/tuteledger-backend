import dns from "node:dns"
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";

// console.log("index.ts loaded");
connectDB();


if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

export default app;