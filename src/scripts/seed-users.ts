import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

type SeedAccount = {
  role: "tutor" | "receptionist";
  name: string | undefined;
  email: string | undefined;
  password: string | undefined;
};

// Creates one account, but only if its email is not in the database yet
async function createIfMissing(role: SeedAccount["role"], name: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await UserModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    console.log("Test " + role + " already exists. No changes made.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await UserModel.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role,
    active: true,
  });

  console.log("Test " + role + " account created.");
}

async function seedAccounts() {
  const mongoUrl = process.env.MONGO_URL;

  const accounts: SeedAccount[] = [
    {
      role: "tutor",
      name: process.env.SEED_TUTOR_NAME,
      email: process.env.SEED_TUTOR_EMAIL,
      password: process.env.SEED_TUTOR_PASSWORD,
    },
    {
      role: "receptionist",
      name: process.env.SEED_RECEPTIONIST_NAME,
      email: process.env.SEED_RECEPTIONIST_EMAIL,
      password: process.env.SEED_RECEPTIONIST_PASSWORD,
    },
  ];

  // Check every setting first, so nothing is created if one is missing
  if (!mongoUrl) {
    throw new Error("Missing MONGO_URL");
  }
  for (const account of accounts) {
    if (!account.name || !account.email || !account.password) {
      throw new Error("Missing " + account.role + " settings");
    }
  }

  try {
    await mongoose.connect(mongoUrl);
    await UserModel.init();

    for (const account of accounts) {
      await createIfMissing(account.role, account.name as string, account.email as string, account.password as string);
    }
  } finally {
    await mongoose.disconnect();
  }
}

seedAccounts().catch((error) => {
  console.error("Account setup failed:", error);
  process.exitCode = 1;
});