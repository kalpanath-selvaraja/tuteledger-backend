// src/config/db.ts
import mongoose from "mongoose";
import { env } from "../config/env";
import dns from "node:dns";

// Apply the DNS workaround whichever application entry point is used.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

let connectPromise : Promise<void> | null = null

export async function connectDB(): Promise<void>{
  if(mongoose.connection.readyState === 1 ){
    return;
  }

  if(!connectPromise){
    connectPromise = mongoose
    .connect(env.mongoUrl, {
      serverSelectionTimeoutMS: 10000,
    }).then(() => {
      console.log("MongoDB connected.")
    }).finally(() => {
      connectPromise = null;
    })
  }

  await connectPromise;
}