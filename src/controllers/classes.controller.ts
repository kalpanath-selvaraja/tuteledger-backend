import { Request, Response } from "express";
import { HydratedDocument, isValidObjectId } from "mongoose";
import { ClassModel, DAYS_OF_WEEK, IClass } from "../models/class.model";
import { sendError, sendSuccess } from "../utils/response";
import { EnrollmentModel } from "../models/enrollment.model";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const validateClassFields = ( name: unknown,subject: unknown,dayOfWeek: unknown,startTime: unknown, monthlyFeeLKR: unknown ): string[] => {
  const errors: string[] = [];

  if (typeof name !== "string" || !name.trim()) {
    errors.push("Name is required.");
  }

  if (typeof subject !== "string" || !subject.trim()) {
    errors.push("Subject is required.");
  }

  if (typeof dayOfWeek !== "string" || !(DAYS_OF_WEEK as readonly string[]).includes(dayOfWeek)) {
    errors.push("Day of week must be one of " + DAYS_OF_WEEK.join(","));
  }

  if (typeof startTime !== "string" || !TIME_PATTERN.test(startTime)) {
    errors.push("Start time must be in HH:mm format, for example 16:30");
  }

  if (typeof monthlyFeeLKR !== "number" || !Number.isInteger(monthlyFeeLKR) || monthlyFeeLKR < 1) {
    errors.push("Monthly fee must be a whole number of LKR, at least 1");
  }

  return errors;
};

// Builds the response field by field, so nothing extra is ever sent.
const toClassResponse = (tuitionClass: HydratedDocument<IClass>) => {
  return {
    id: tuitionClass._id.toString(),
    name: tuitionClass.name,
    subject: tuitionClass.subject,
    dayOfWeek: tuitionClass.dayOfWeek,
    startTime: tuitionClass.startTime,
    monthlyFeeLKR: tuitionClass.monthlyFeeLKR,
    active: tuitionClass.active,
  };
};

// Create class
export const createClass = async (req: Request, res: Response) => {
  const { name, subject, dayOfWeek, startTime, monthlyFeeLKR } = req.body ?? {};

  const errors = validateClassFields(name, subject, dayOfWeek, startTime, monthlyFeeLKR);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const created = await ClassModel.create({
      name: name.trim(),
      subject: subject.trim(),
      dayOfWeek: dayOfWeek,
      startTime: startTime,
      monthlyFeeLKR: monthlyFeeLKR,
    });

    return sendSuccess(res, toClassResponse(created), 201);
  } catch (err) {
    return sendError(res, 500, "Could not create the class.")
  }
}

// Get classes
export const getClasses = async (_req: Request, res: Response) => {
    try {
        const classList = await ClassModel.find().sort({ name: 1 });
        const classResponseList: ReturnType<typeof toClassResponse>[] = [];

        for (const tuitionClass of classList) {
            const classResponse = toClassResponse(tuitionClass);
            classResponseList.push(classResponse);
        }

        return sendSuccess(res, classResponseList);
    } catch (err) {
        return sendError(res, 500, "Could not load the classes.");
    }
};

// Get class
export const getClassById = async (req: Request, res: Response) => {
  const id = req.params.id

  if (!isValidObjectId(id)) {
    return sendError(res, 404, "Class not found.")
  }

  try {
    const found = await ClassModel.findById(id)

    if (!found) {
      return sendError(res, 404, "Class not found.")
    }

    return sendSuccess(res, toClassResponse(found))
  } catch (err) {
    return sendError(res, 500, "Could not load the class.")
  }
}

// Update class
export const updateClass = async (req: Request, res: Response) => {
  const id = req.params.id
  const { name, subject, dayOfWeek, startTime, monthlyFeeLKR, active } = req.body ?? {}

  const errors = validateClassFields(name, subject, dayOfWeek, startTime, monthlyFeeLKR)

  if (active !== undefined && typeof active !== "boolean") {
    errors.push("Active must be true or false.")
  }

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors)
  }

  if (!isValidObjectId(id)) {
    return sendError(res, 404, "Class not found.")
  }

  try {
    const found = await ClassModel.findById(id)

    if (!found) {
      return sendError(res, 404, "Class not found.")
    }

    found.name = name.trim()
    found.subject = subject.trim()
    found.dayOfWeek = dayOfWeek
    found.startTime = startTime
    found.monthlyFeeLKR = monthlyFeeLKR

    if (active !== undefined) {
      found.active = active
    }

    await found.save()

    return sendSuccess(res, toClassResponse(found))
  } catch (err) {
    return sendError(res, 500, "Could not update the class.")
  }
}

// Delete class
export const deleteClass = async (req: Request, res: Response) => {
  const id = req.params.id

  if (!isValidObjectId(id)) {
    return sendError(res, 404, "Class not found.")
  }

  try {
    const found = await ClassModel.findById(id)

    if (!found) {
      return sendError(res, 404, "Class not found.")
    }

    const enrollmentCount = await EnrollmentModel.countDocuments({ classId: found._id })

    if (enrollmentCount > 0) {
      return sendError(res, 409, "This class has enrollments and cannot be deleted.")
    }

    await found.deleteOne()

    return sendSuccess(res, null)
  } catch (err) {
    return sendError(res, 500, "Could not delete the class.")
  }
}