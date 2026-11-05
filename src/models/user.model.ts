import { Schema, model } from "mongoose";

export type UserRole = "tutor" | "receptionist";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["tutor", "receptionist"], default: "receptionist", required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>("system_users", userSchema);