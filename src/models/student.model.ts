import { Schema , model } from "mongoose";

export const STUDENT_STATUSES = ["active", "inactive"] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number]

export interface IStudent {
    name : string
    guardianName : string
    phone:string
    status: StudentStatus
}

const studentSchema = new Schema<IStudent>(
    {
        name: {type :String, required: true, trim: true},
        guardianName: {type : String, required: true, trim: true},
        phone :{ type:String , required: true, trim: true, match: /^\+?[0-9]{9,12}$/},
        status: {type: String, enum: STUDENT_STATUSES, default : "active"}
    },
    {
        timestamps: true
    }
)

studentSchema.index({name : 1}); // This index is the alphabetical index on `register`,
//  meaning it lets MongoDB sort our names without reading every row. It can just sort it by the name instead of reading every row. 

export const StudentModel = model<IStudent>("students", studentSchema)

