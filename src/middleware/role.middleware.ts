import { Response ,NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { sendError } from "../utils/response";

export const requireTutor  = (req: AuthRequest, res: Response, next: NextFunction) => {

    if(!req.user){
        return sendError(res, 401, "Authentication required");
    }

    if(req.user?.role !== "tutor"){
        return sendError(res, 403, "Only the tutor can do this.");
    }

    next();
}