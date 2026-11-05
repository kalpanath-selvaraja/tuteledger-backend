import {Request, Response} from "express";
import { UserModel } from "../models/user.model";
import bcrypt from "bcryptjs"
import { signAccessToken } from "../utils/tokens";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendError, sendSuccess } from "../utils/response";



export const login = async (req: Request, res: Response) => {
    
        const {email, password} = req.body ?? {};  // if the req is undefined or null this will use an empty object instead

        if
        (
            typeof email !== "string" || typeof password !== "string"||
            !email.trim()||
            !password
        ){
            return res.status(400).json({
                success : false,
                message: "Email and password are required."
            });
        }

        const user = await UserModel.findOne({
            email: email.trim().toLowerCase()
        }).select("+passwordHash");


        const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

        if (!user || !passwordOk || !user.active) {
            return sendError(res, 401, "Invalid email or password.");
        }



        


        const accessToken = signAccessToken(user._id.toString())

        return sendSuccess(res, {

            accessToken: signAccessToken(user._id.toString()),
            user: { 
                id: user._id.toString(), 
                name: user.name, 
                email: user.email, 
                role: user.role 
            },

        });
    
    
}

export const getMe = (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return sendError(res, 401, "Authentication required.");
    }

    return sendSuccess(res, req.user);
};