import jwt from "jsonwebtoken";
import { env } from "../config/env";

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

export const verifyAccessToken = (token: string): { sub: string } => {

  const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
  
  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new Error("Malformed token payload");
  }
  return { sub: payload.sub };
};

