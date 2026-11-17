import { model, Schema, Types } from "mongoose";
import { isValidMonth } from "../utils/months";

export interface IEnrollment  {
    studentId: Types.ObjectId
    classId: Types.ObjectId
    startMonth: string
    endMonth: string | null
}


const enrollmentSchema = new Schema<IEnrollment>(
    {
        // Since what we are getting here is a student ID of a object's ID, that is why the type is the schemas object ID. 
        studentId: {type: Schema.Types.ObjectId, ref:"students" , required: true},
        classId: {type: Schema.Types.ObjectId, ref : "classes", required:  true},
        startMonth: {type: String, required: true, validate: isValidMonth},
        endMonth:{ 
            type: String, 
            default: null, 
            validate : (value: string | null) => value === null || isValidMonth(value)
        }
    },
    {timestamps: true}

)

// with Unique, 
// MongoDB will reject any attempt to insert a second document with the exact same combination,
//  with the exact same values of student ID and class ID

// 1 means Ascending -1 means descending. 
// This will also speed up our query searches. 
enrollmentSchema.index( {studentId: 1, classId: 1}, {unique: true} )

// Because of the index above only since studnetId is the first value,
// the individual look up by classId is slow so we have a seperate index for classID
enrollmentSchema.index({ classId: 1})


export const EnrollmentModel = model<IEnrollment>("enrollments", enrollmentSchema);