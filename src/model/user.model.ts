import { Schema, model } from "mongoose"


type UserRole = "tutor" | "receptionist";

export interface IUser extends Document{
    name: string
    email: string
    password: string
    role: UserRole
    active : boolean
}


const userSchema = new Schema<IUser>(
    {
        name : {
            type : String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            // select: false,
        },
        role:{
            type: String,
            emun:["tutor" , "receptionist"],
            default : "receptionist",
            required: true,

        },
        active:{
            type: Boolean,
            default: true
        }
    },
    {timestamps: true}
)

export const UserModel = model<IUser>("system_users", userSchema)