import { Request, Response } from "express";
import { HydratedDocument, isValidObjectId } from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";
import { IStudent, STUDENT_STATUSES, StudentModel } from "../models/student.model";
import { sendError, sendSuccess } from "../utils/response";

const PHONE_PATTERN = /^\+?[0-9]{9,12}$/;

const validateStudentFields = (name: unknown, guardianName: unknown, phone: unknown): string[] => {
  const errors: string[] = [];

  if (typeof name !== "string" || !name.trim()) {
    errors.push("Name is required.");
  }

  if (typeof guardianName !== "string" || !guardianName.trim()) {
    errors.push("Guardian name is required.");
  }

  if (typeof phone !== "string" || !PHONE_PATTERN.test(phone.trim())) {
    errors.push("Phone must be 9 to 12 digits, with an optional + at the start.");
  }

  return errors;
}

const toStudentResponse = (s: HydratedDocument<IStudent>) => {
  return {
    id: s._id.toString(),
    name: s.name,
    guardianName: s.guardianName,
    phone: s.phone,
    status: s.status,
  }
}

const escapeRegex = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export const createStudent = async (req: Request, res: Response) => {
  const { name, guardianName, phone } = req.body ?? {}

  const errors = validateStudentFields(name, guardianName, phone)

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const created = await StudentModel.create({
      name: name.trim(),
      guardianName: guardianName.trim(),
      phone: phone.trim(),
    })

    return sendSuccess(res, toStudentResponse(created), 201)
  } catch (err) {
    return sendError(res, 500, "Could not create the student.")
  }
}

export const getStudents = async (req: Request, res: Response) => {

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

  const errors: string[] = [];

  if (!Number.isInteger(page) || page < 1) {
    errors.push("Page must be a whole number, at least 1.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    errors.push("Limit must be a whole number from 1 to 50.");
  }

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  const filter = search ? { name: { $regex: escapeRegex(search), $options: "i" } } : {};

  try {
    const [students, total] = await Promise.all([
      StudentModel.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      StudentModel.countDocuments(filter),
    ])

    return sendSuccess(res, {
      students: students.map((s) => {
        return toStudentResponse(s)
      }),
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return sendError(res, 500, "Could not load the students")
  }
}

export const getStudentById = async (req: Request, res: Response) => {
  const id = req.params.id

  if (!isValidObjectId(id)) {
    return sendError(res, 404, "Student not found.")
  }

  try {
    const found = await StudentModel.findById(id)

    if (!found) {
      return sendError(res, 404, "Student not found.")
    }

    return sendSuccess(res, toStudentResponse(found))
  } catch (err) {
    return sendError(res, 500, "Could not load the student")
  }
}

export const updateStudent = async (req: AuthRequest, res: Response) => {
  const id = req.params.id
  const { name, guardianName, phone, status } = req.body ?? {};

  if (status !== undefined && req.user?.role !== "tutor") {
    return sendError(res, 403, "Only the tutor can change a student's status")
  }

  const errors = validateStudentFields(name, guardianName, phone);

  if (status !== undefined && (typeof status !== "string" || !(STUDENT_STATUSES as readonly string[]).includes(status))) {
    errors.push("Status must be one of " + STUDENT_STATUSES.join(", "));
  }

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors)
  }

  if (!isValidObjectId(id)) {
    return sendError(res, 404, "Student not found.")
  }

  try {
    const found = await StudentModel.findById(id)

    if (!found) {
      return sendError(res, 404, "Student not found.")
    }

    found.name = name.trim()
    found.guardianName = guardianName.trim()
    found.phone = phone.trim()

    if (status !== undefined) {
      found.status = status
    }

    await found.save()

    return sendSuccess(res, toStudentResponse(found))
  } catch (err) {
    return sendError(res, 500, "Could not update the student.")
  }
}