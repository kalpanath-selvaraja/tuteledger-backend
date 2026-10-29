import jwt from "jsonwebtoken";
import { IUser } from "../model/user.model";


const JWT_SECRET = process.env.JWT_SECRET;

if(!JWT_SECRET){
    throw new Error ("JWT_Secret is required. ");
}

export const signAccessToken = (userId:string):string => {
    return jwt.sign(
        {sub:userId},
        JWT_SECRET,
        {expiresIn: "15m", algorithm: "HS256"}
        
    )
}

