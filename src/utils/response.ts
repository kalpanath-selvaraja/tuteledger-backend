import { Response } from "express";

export const sendSuccess = <T>(res: Response, data: T, status = 200) =>{
  res.status(status).json({ success: true, data });

}

export const sendError = (res: Response, status: number, message: string, errors?: unknown[]) =>{
  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
}