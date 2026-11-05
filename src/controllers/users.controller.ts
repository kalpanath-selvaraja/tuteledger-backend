import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model";
import { sendError, sendSuccess } from "../utils/response";

const MIN_PASSWORD_LENGTH = 8;

export const createUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body ?? {};

  const errors: string[] = [];

  if (typeof name !== "string" || !name.trim()) {
    errors.push("Name is required.");
  }

  if (typeof email !== "string" || !email.trim()) {
    errors.push("Email is required.");
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    errors.push("Password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
  }

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    const existing = await UserModel.findOne({ email: cleanEmail });

    if (existing) {
      return sendError(res, 409, "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash: passwordHash,
      role: "receptionist",
    });

    return sendSuccess(
      res,
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
      201
    );
  } catch (err) {
    return sendError(res, 500, "Could not create the user.");
  }
};