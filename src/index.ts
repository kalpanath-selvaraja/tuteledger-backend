import dns from "node:dns"
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";

console.log("index.ts loaded");
connectDB();

const PORT = Number(process.env.PORT) || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;