// src/config/db.ts
import mongoose from "mongoose";
import { env } from "../config/env";
import { promises } from "node:dns";

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