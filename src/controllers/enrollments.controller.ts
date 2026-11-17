import { Request ,Response } from "express";
import { HydratedDocument, isValidObjectId } from "mongoose";
import { sendError, sendSuccess } from "../utils/response";
import { StudentModel } from "../models/student.model";
import { ClassModel } from "../models/class.model";
import { EnrollmentModel, IEnrollment } from "../models/enrollment.model";
import { getCurrentMonth, isValidMonth } from "../utils/months";
import { PaymentModel } from "../models/payment.model"


const toEnrollmentResponse = (e: HydratedDocument<IEnrollment>) => {

  return {
    id: e._id.toString(),
    studentId: e.studentId.toString(),
    classId: e.classId.toString(),
    startMonth: e.startMonth,

    endMonth: e.endMonth,
  }
}



// Create Enrollments
export const createEnrollment = async (req:Request, res:Response) => {
    const {studentId, classId} = req.body ?? {};

    const errors: string[] = [];

    if(typeof studentId !== "string" || !isValidObjectId(studentId)){
        errors.push("Student id is required")
    }

    if(typeof classId !== "string" || !isValidObjectId(classId)){
        errors.push("ClassId is required")
    }

    if(errors.length > 0){
        return sendError(res, 400, "Validation failed", errors)
    }

    try{

        const student = await StudentModel.findById(studentId);

        if(!student){
            return sendError(res, 404, "Student not found")
        }

        const classFound  = await ClassModel.findById(classId);

        if(!classFound){
            return sendError(res, 404, "Class not found")
        }

        if(student.status !== "active"){
            return sendError(res, 409, "Student is not active. ")
        }

        if(!classFound.active){
            return sendError(res, 409, "Class is not active." )
        }

        const existing = await EnrollmentModel.findOne({studentId, classId});
        if(existing){
            if(existing.endMonth === null){
                return sendError(res, 409, "Student is already enrolled in this class.")
            }

            return sendError(res, 409, "The student was enrolled in this class before. Ask the tutor to reopen that enrollment.")
        }

        const created = await EnrollmentModel.create({
            studentId,
            classId,
            startMonth:getCurrentMonth(),
            endMonth: null
        })

        return sendSuccess(res, toEnrollmentResponse(created), 201)

    }catch(err){
        return sendError(res, 500, "Could not create the enrollment. ")
    }

}

export const updateEnrollmengts = async(req:Request, res: Response) => {

    const id = req.params.id
    const {endMonth} = req.body ?? {}

    if(!isValidObjectId(id)){
        return sendError( res, 404 , "Enrollment not found")
    }

    if(endMonth !== null && !isValidMonth(endMonth)){
        return sendError(res, 400, "Validation Failed" , 
            ["End month must be a month like 2026-11, or null to reopen."])
    }

    try{

        const found = await EnrollmentModel.findById(id)

        if(!found){
            return sendError(res, 404, "Enrollment not found")
        }

        if(endMonth === null){

            if(found.endMonth === null){
                return  sendError(res, 409, "Enrollment is already active.");
            } 

            found.endMonth = null;
        } else {
        
            const errors: string[] = [];

            if (endMonth < found.startMonth) {
                errors.push("End month cannot be before the start month " + found.startMonth + ".");
            }

            if (endMonth > getCurrentMonth()) {
                errors.push("End month cannot be in the future.");
            }

            if (errors.length > 0) {
                return sendError(res, 400, "Validation failed.", errors);
            }
            
            const laterRows = await PaymentModel.countDocuments({
                enrollmentId: found._id,
                status: "active",
                month: { $gt: endMonth },
            });

            if (laterRows > 0) {
                return sendError(res, 409, "Payments or waivers exist after that month. Void them first.");
            }
            found.endMonth = endMonth;
        }
        
        await found.save();
        return sendSuccess(res, null, 200);

    }catch(err){
        return sendError(res, 500, "Could not update the enrollment.");
    }
}

export const getEnrollments = async (req: Request, res: Response) => {
    const {studentId, classId} = req.query

    const errors: string[] = [];
    const filter : {studentId? : string; classId? :string} = {};

    if (studentId !== undefined) {
        if (typeof studentId !== "string" || !isValidObjectId(studentId)) {
        errors.push("Student id is not valid.");
        } else {
        filter.studentId = studentId;
        }
    }

    if(classId !== undefined){
        if(typeof classId !== "string" || !isValidObjectId(classId)){
            errors.push("Class is is not valid")
        }else{
            filter.classId = classId
        }
    }

    if (errors.length > 0) {
        return sendError(res, 400, "Validation failed.", errors);
    }

    try {
        const found = await EnrollmentModel.find(filter).sort({ startMonth: 1 });

        return sendSuccess(res, found.map((e) => {
        return toEnrollmentResponse(e);
        }));
    } catch (err) {
        return sendError(res, 500, "Could not load the enrollments.");
    }
}

