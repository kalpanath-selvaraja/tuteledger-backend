import {Request, Response} from "express";
import { UserModel } from "../model/user.model";
import bcrypt from "bcryptjs"
import { signAccessToken } from "../utils/tokens";
import { AuthRequest } from "../middleware/auth.middleware";



export const login = async (req: Request, res: Response) => {
    try{
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
        }).select("+password");


        

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password !"
            });
        }
        
        
        
        const isValid = await bcrypt.compare(password, user.password);
        
        
        
        if (!isValid) {
            return res.status(401).json({
                message: "Invalid email or password !"
            });
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

export const getMe   = async (req: AuthRequest, res: Response ) => {


    if(!req.user.sub){
        res.status(401).json({
            success: false,
            message: "Authentication required"
        });
        return;
    }

    try{

        const user = await UserModel.findById(req.user.sub);
       
        if(!user || !user.active){
            res.status(401).json({
                success: false,
                message: "Account unavailable",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                id : user._id.toString(),
                name : user.name,
                email : user.email,
                role: user.role
            }
        });

    }catch(error){
        console.error("Failed to retrieve current user:" , error);
        
        res.status(500).json({
            success: false,
            message: "Unable to retrieve account."
        });

    }

}

