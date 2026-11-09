import {Request, Response} from "express";
import { UserModel } from "../models/user.model";
import bcrypt  from "bcryptjs"
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendError, sendSuccess } from "../utils/response";



export const login = async (req: Request, res: Response) => {
    
    const {email, password} = req.body ?? {};  // if the req is undefined or null this will use an empty object instead

    if(typeof email !== "string" || typeof password !== "string"||!email.trim()||!password){
        return sendError(res, 400, "Email and password are required.");   
    }
    
    const user = await UserModel.findOne({
        email: email.trim().toLowerCase()
    }).select("+passwordHash");

    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordOk || !user.active) {
        return sendError(res, 401, "Invalid email or password.");
    }

    const accessToken = signAccessToken(user._id.toString())
    const refreshToken = signRefreshToken(user._id.toString())

    return sendSuccess(res, {
        accessToken: accessToken,
        refreshToken:refreshToken,
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

export const refreshAccessToken = async (req: Request , res:Response) => {
   const {refreshToken} = req.body ?? {};

   
   if(typeof refreshToken !== "string" || refreshToken.trim() === "" ){
    return sendError (res , 401 , "Invalid or expired refresh token")
   }


   try{
    const payload  =   verifyRefreshToken(refreshToken)

    const user = await UserModel.findById(payload.sub)

    if(!user || !user.active){
        return sendError(res, 401, "Invalid or expired refresh token")
    }
    
    const newAccessToken = signAccessToken(payload.sub)

    return sendSuccess(res, { accessToken: newAccessToken })

   }catch{
    return sendError (res , 401 , "Invalid or expired refresh token")
   }






   
}