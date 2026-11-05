import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function seedTutor() {
  const mongoUrl = process.env.MONGO_URL;
  const name = process.env.SEED_TUTOR_NAME;
  const email = process.env.SEED_TUTOR_EMAIL;
  const password = process.env.SEED_TUTOR_PASSWORD;

  if (!mongoUrl || !name || !email || !password) {
    throw new Error("Missing database or test-account settings");
  }

  try {
    await mongoose.connect(mongoUrl);
    await UserModel.init();

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      console.log("Account already exists. No changes made.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await UserModel.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: "tutor",
      active: true,
    });

    console.log("Test tutor account created.");
  } finally {
    await mongoose.disconnect();
  }
}

seedTutor().catch((error) => {
  console.error("Account setup failed:", error);
  process.exitCode = 1;
});