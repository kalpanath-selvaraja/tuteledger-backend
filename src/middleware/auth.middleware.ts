import { NextFunction, Request, Response } from "express";
import { UserModel, UserRole } from "../models/user.model";
import { verifyAccessToken } from "../utils/tokens";
import { sendError } from "../utils/response";

export interface AuthRequest extends Request {
  user?: { id: string; name: string; email: string; role: UserRole };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return sendError(res, 401, "Authentication required.");
  }

  const parts = authHeader.split(" ");
  const scheme = parts[0];
  const token = parts[1];

  if (scheme !== "Bearer" || !token) {
    return sendError(res, 401, "Authentication required.");
  }

  let userId: string;

  try {
    const payload = verifyAccessToken(token);
    userId = payload.sub;
  } catch (err) {
    return sendError(res, 401, "Invalid or expired token.");
  }

  const user = await UserModel.findById(userId);

  if (!user || !user.active) {
    return sendError(res, 401, "Account unavailable.");
  }

  req.user = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  next();
};