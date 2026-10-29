import {Request, Response} from "express";
import { UserModel } from "../model/user.model";
import bcrypt from "bcryptjs"
import { signAccessToken } from "../utils/tokens";

// After checking the email and password:
// const accessToken = signAccessToken(user.id);

export const login = async (req: Request, res: Response) => {
    const {email, password} = req.body

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

    try{

        const user = await UserModel.findOne({
            email: email.trim().toLowerCase()
        }).select("+password");

        if(!user){
            return res.status(401).json({message: "Invalid email or password !"})
        }

        const isValid = await bcrypt.compare(password, user?.password)
        if (!isValid){
            return res.status(401).json({message: "Invalid email or password !"})
        }


        const accessToken = signAccessToken(user._id.toString())

        res.status(200).json({
            message: "User successfully logged in.",
            data:{
                email:user.email,
                role:user.role,
                access_token:accessToken,
            }
        })
    }catch(err){
        console.error(err)
        res.status(500).json({
            success: false,
            message: "Login Failed"
        })
    }
}

