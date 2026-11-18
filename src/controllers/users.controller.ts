import { Request, Response } from "express";
import { HydratedDocument, isValidObjectId } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser, UserModel } from "../models/user.model";
import { sendError, sendSuccess } from "../utils/response";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateUserFields = (name: unknown, email: unknown, password: unknown, passwordRequired: boolean) => {
  const errors: string[] = [];

  if (typeof name !== "string" || !name.trim()) {
    errors.push("Name is required.");
  }

  if (typeof email !== "string" || !email.trim()) {
    errors.push("Email is required.");
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.push("Enter a valid email address.");
  }

  if (passwordRequired || (password !== undefined && password !== "")) {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      errors.push("Password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
    }
  }

  return errors;
};

const toUserResponse = (user: HydratedDocument<IUser>) => {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  };
};

const isDuplicateEmail = (error: unknown) => {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, role = "receptionist" } = req.body ?? {};
  const errors = validateUserFields(name, email, password, true);

  if (role !== "tutor" && role !== "receptionist") {
    errors.push("Role must be tutor or receptionist.");
  }

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await UserModel.findOne({ email: cleanEmail });

    if (existingUser) {
      return sendError(res, 409, "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash: passwordHash,
      role: role,
    });

    return sendSuccess(res, toUserResponse(user), 201);
  } catch (error) {
    if (isDuplicateEmail(error)) {
      return sendError(res, 409, "An account with this email already exists.");
    }
    return sendError(res, 500, "Could not create the user.");
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().sort({ name: 1, _id: 1 });
    const userList: ReturnType<typeof toUserResponse>[] = [];

    users.forEach((user) => {
      userList.push(toUserResponse(user));
    });

    return sendSuccess(res, userList);
  } catch (error) {
    return sendError(res, 500, "Could not load the staff.");
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { name, email, password } = req.body ?? {};
  const errors = validateUserFields(name, email, password, false);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  if (!isValidObjectId(userId)) {
    return sendError(res, 404, "User not found.");
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return sendError(res, 404, "User not found.");
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await UserModel.findOne({ email: cleanEmail, _id: { $ne: user._id } });

    if (existingUser) {
      return sendError(res, 409, "An account with this email already exists.");
    }

    user.name = name.trim();
    user.email = cleanEmail;
    if (password !== undefined && password !== "") {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    return sendSuccess(res, toUserResponse(user));
  } catch (error) {
    if (isDuplicateEmail(error)) {
      return sendError(res, 409, "An account with this email already exists.");
    }
    return sendError(res, 500, "Could not update the user.");
  }
};
