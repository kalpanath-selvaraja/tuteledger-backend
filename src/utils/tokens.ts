import jwt from "jsonwebtoken";
import { env } from "../config/env";



export const signAccessToken = (userId:string):string => {
    return jwt.sign(
        {sub:userId},
        env.jwtSecret,
        {expiresIn: "15m"}
        
    )
}

export const signRefreshToken = (userId : string): string =>{
  return jwt.sign({
      sub:userId.toString(),
    },
    env.jwtRefreshSecret,
    {expiresIn: "7d"}
  )
}

export const verifyAccessToken = (token: string): { sub: string } => {

  const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
  
  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new Error("Malformed token payload");
  }
  return { sub: payload.sub };
};

export const verifyRefreshToken = (token: string): {sub:string} => {
  const payload = jwt.verify(token, env.jwtRefreshSecret, { algorithms: ["HS256"]});

  if(typeof payload === "string"  || typeof payload.sub !== "string"){
    throw new Error ("Malformed token payload");
  }
  
  return {sub: payload.sub}
}

