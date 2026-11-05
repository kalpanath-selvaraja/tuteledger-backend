import jwt from "jsonwebtoken";
import { env } from "../config/env";



export const signAccessToken = (userId:string):string => {
    return jwt.sign(
        {sub:userId},
        env.jwtSecret,
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

