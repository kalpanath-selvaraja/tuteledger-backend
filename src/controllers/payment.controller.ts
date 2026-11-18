import { Request, Response } from "express";
import { HydratedDocument, Types, isValidObjectId } from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";
import { ClassModel  , IClass} from "../models/class.model";
import { EnrollmentModel, IEnrollment } from "../models/enrollment.model";
import { IPayment, PaymentKind, PaymentModel } from "../models/payment.model";
import { getFeeForMonth } from "../utils/fee";
import { getCurrentMonth, isValidMonth } from "../utils/months";
import { sendError, sendSuccess } from "../utils/response";

const MAX_ITEMS = 24;
const MAX_REASON_LENGTH = 200;

type Item = { enrollmentId: string; month: string };


const toPaymentResponse = (payment: HydratedDocument<IPayment>) => {
  return {
    id: payment._id.toString(),
    enrollmentId: payment.enrollmentId.toString(),
    month: payment.month,
    kind: payment.kind,
    amountLKR: payment.amountLKR,
    paidOn: payment.paidOn,
    receiptNo: payment.receiptNo,
    reason: payment.reason,
    recordedBy: payment.recordedBy.toString(),
    status: payment.status,
    voidReason: payment.voidReason,
  };
};

// Example: R-202611-3FA9C2. The last 6 characters of an ObjectId change with every new id.
const makeReceiptNo = () => {
  const stamp = getCurrentMonth().replace("-", "");
  const tail = new Types.ObjectId().toString().slice(-6).toUpperCase();
  return "R-" + stamp + "-" + tail;
};

// MongoDB reports a broken unique index with error code 11000 , i will have to change this 
const isDuplicateKeyError = (err: unknown): boolean => {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
};

// Checks the shape of one list of  enrollmentId, month  and returns clean items.
// Ids are rewritten to lowercase hex so the same id always compares equal.

const readItems = (rawItems: unknown[], errors: string[]): Item[] => {
  const items: Item[] = [];

  const seen = new Set<string>();

  for (const raw of rawItems) {


    // to handle type safty , 
    // If raw is `null`, or  `undefined`, it falls back to an empty object. 
    // This is the second part. It tells TypeScript to treat the object that might come as 
    // an enrollment ID and a month property as optional. That is why the question mark exists. 
    const entry = (raw ?? {}) as { enrollmentId?: unknown; month?: unknown };

    if (typeof entry.enrollmentId !== "string" || !isValidObjectId(entry.enrollmentId)) {
      errors.push("Every item needs a valid enrollment id.");
      continue;
    }

    if (!isValidMonth(entry.month)) {
      errors.push("Every item needs a month like 2026-11.");
      continue;
    }

    const enrollmentId = new Types.ObjectId(entry.enrollmentId).toString();
    const key = enrollmentId + "|" + entry.month;

    if (seen.has(key)) {
      errors.push("The same enrollment and month appear more than once.");
      continue;
    }

    seen.add(key);
    items.push({ enrollmentId, month: entry.month });
  }

  return items;
};

// The shared part of POST payments 
//  POST waivers
const recordRows = async (
  res: Response,
  userId: string,
  items: Item[],
  kind: PaymentKind,
  reason: string | null
) => {
  try {
    
    // Load each enrollment and class once.
    const enrollmentIdSet = new Set<string>();

    for (const item of items) {
      enrollmentIdSet.add(item.enrollmentId);
    }

    const enrollmentIds = Array.from(enrollmentIdSet);
    const enrollments = await EnrollmentModel.find({ _id: { $in: enrollmentIds } });

    if (enrollments.length !== enrollmentIds.length) {
      return sendError(res, 404, "Enrollment not found.");
    }

    const classIdSet = new Set<string>();
    const enrollmentById = new Map<string, HydratedDocument<IEnrollment>>();

    for (const enrollment of enrollments) {
      classIdSet.add(enrollment.classId.toString());
      enrollmentById.set(enrollment._id.toString(), enrollment);
    }

    const classIds = Array.from(classIdSet);
    const classes = await ClassModel.find({ _id: { $in: classIds } });
    const classById = new Map<string, HydratedDocument<IClass>>();

    for (const tuitionClass of classes) {
      classById.set(tuitionClass._id.toString(), tuitionClass);
    }

    //  the month must be inside the enrollment's period (no prepaying, no month before joining)
    const currentMonth = getCurrentMonth();
    const periodErrors: string[] = [];

    for (const item of items) {
      const enrollment = enrollmentById.get(item.enrollmentId);

      if (!enrollment) {
        return sendError(res, 404, "Enrollment not found.");
      }

      const lastMonth = enrollment.endMonth ?? currentMonth;

      if (item.month < enrollment.startMonth || item.month > currentMonth || item.month > lastMonth) {
        periodErrors.push(
          item.month + " is outside the billing period (" + enrollment.startMonth + " to " + lastMonth + ")."
        );
      }
    }

    if (periodErrors.length > 0) {
      return sendError(res, 400, "Validation failed.", periodErrors);
    }

    //  nothing may already be paid or waived (the unique index is the backstop for races)
    const taken = await PaymentModel.find({
      status: "active",
      $or: items,
    });

    if (taken.length > 0) {
      const takenMonths: string[] = [];

      for (const payment of taken) {
        takenMonths.push(payment.month);
      }

      const months = takenMonths.join(", ");
      return sendError(res, 409, "Already paid or waived: " + months + ".");
    }

    //  one row per enrollment-month, all sharing one receipt number and one timestamp
    const receiptNo = kind === "payment" ? makeReceiptNo() : null;
    const now = new Date();

    const rows: IPayment[] = [];

    for (const item of items) {
      const enrollment = enrollmentById.get(item.enrollmentId)!;
      const tuitionClass = classById.get(enrollment.classId.toString())!;

      let amountLKR = 0;

      if (kind === "payment") {
        amountLKR = getFeeForMonth(tuitionClass, item.month);
      }

      const paymentRow: IPayment = {
        enrollmentId: enrollment._id,
        month: item.month,
        kind: kind,
        amountLKR: amountLKR,
        paidOn: now,
        receiptNo: receiptNo,
        reason: reason,
        recordedBy: new Types.ObjectId(userId),
        status: "active",
        voidReason: null,
      };

      rows.push(paymentRow);
    }

    const createdPayments = await PaymentModel.insertMany(rows);

    // Calculate the total and prepare the payment response.
    let totalLKR = 0;
    const paymentResponseList: ReturnType<typeof toPaymentResponse>[] = [];

    for (const payment of createdPayments) {
        totalLKR = totalLKR + payment.amountLKR;

        const paymentResponse = toPaymentResponse(payment);
        paymentResponseList.push(paymentResponse);
    }

    return sendSuccess(res, {
        receiptNo: receiptNo,
        totalLKR: totalLKR,
        payments: paymentResponseList,
    }, 201);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return sendError(res, 409, "One of these months was just paid or waived by someone else.");
    }

    return sendError(res, 500, "Could not record the payment.");
  }
};

// POST payments (Tutor and Receptionist)
// Create payment
export const createPayment = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, "Authentication required.");
  }

  const { items } = req.body ?? {};
  const errors: string[] = [];

  if (!Array.isArray(items) || items.length === 0) {
    return sendError(res, 400, "Validation failed.", ["Items must be a list with at least one entry."]);
  }

  if (items.length > MAX_ITEMS) {
    return sendError(res, 400, "Validation failed.", ["At most " + MAX_ITEMS + " months per receipt."]);
  }

  const clean = readItems(items, errors);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  return recordRows(res, req.user.id, clean, "payment", null);
};

// POST waivers (Tutor only)
// Create waiver
export const createWaiver = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, "Authentication required.");
  }

  const { enrollmentId, months, reason } = req.body ?? {};
  const errors: string[] = [];

  if (typeof enrollmentId !== "string" || !isValidObjectId(enrollmentId)) {
    errors.push("Enrollment id is required.");
  }

  if (!Array.isArray(months) || months.length === 0) {
    errors.push("Months must be a list with at least one entry.");
  } else if (months.length > MAX_ITEMS) {
    errors.push("At most " + MAX_ITEMS + " months at a time.");
  }

  if (typeof reason !== "string" || !reason.trim()) {
    errors.push("A reason is required.");
  } else if (reason.trim().length > MAX_REASON_LENGTH) {
    errors.push("Reason must be at most " + MAX_REASON_LENGTH + " characters.");
  }

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  const waiverItems: { enrollmentId: string; month: unknown }[] = [];

  for (const month of months as unknown[]) {
    waiverItems.push({ enrollmentId, month });
  }

  const clean = readItems(waiverItems, errors);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  return recordRows(res, req.user.id, clean, "waiver", (reason as string).trim());
};

// GET paymentsby ID
export const getPayments = async (req: Request, res: Response) => {
  const { studentId, enrollmentId, month } = req.query;
  const errors: string[] = [];

  if (studentId !== undefined && (typeof studentId !== "string" || !isValidObjectId(studentId))) {
    errors.push("Student id is not valid.");
  }

  if (enrollmentId !== undefined && (typeof enrollmentId !== "string" || !isValidObjectId(enrollmentId))) {
    errors.push("Enrollment id is not valid.");
  }

  if (month !== undefined && !isValidMonth(month)) {
    errors.push("Month must look like 2026-11.");
  }

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const filter: { enrollmentId?: string | { $in: Types.ObjectId[] }; month?: string } = {};

    if (typeof month === "string") {
      filter.month = month;
    }

    if (typeof enrollmentId === "string") {
      // enrollmentId wins over studentId
      filter.enrollmentId = enrollmentId;
    } else if (typeof studentId === "string") {
      const enrollments = await EnrollmentModel.find({ studentId });
      const enrollmentIds: Types.ObjectId[] = [];

      for (const enrollment of enrollments) {
        enrollmentIds.push(enrollment._id);
      }

      filter.enrollmentId = { $in: enrollmentIds };
    }

    // All statuses are returned, so voided rows stay visible.
    const paymentList = await PaymentModel.find(filter).sort({ paidOn: -1, _id: -1 });
    const paymentResponseList: ReturnType<typeof toPaymentResponse>[] = [];

    for (const payment of paymentList) {
      const paymentResponse = toPaymentResponse(payment);
      paymentResponseList.push(paymentResponse);
    }

    return sendSuccess(res, paymentResponseList);
  } catch (err) {
    return sendError(res, 500, "Could not load the payments.");
  }
};

// PUT payments/:id/void (Tutor only) Works for waivers too voiding a waiver reopens the month
// Void payment
export const voidPayment = async (req: Request, res: Response) => {
  const id = req.params.id;
  const { reason } = req.body ?? {};

  if (!isValidObjectId(id)) {
    return sendError(res, 404, "Payment not found.");
  }

  if (typeof reason !== "string" || !reason.trim()) {
    return sendError(res, 400, "Validation failed.", ["A reason is required."]);
  }

  if (reason.trim().length > MAX_REASON_LENGTH) {
    return sendError(res, 400, "Validation failed.", ["Reason must be at most " + MAX_REASON_LENGTH + " characters."]);
  }

  try {
    const found = await PaymentModel.findById(id);

    if (!found) {
      return sendError(res, 404, "Payment not found.");
    }

    if (found.status === "voided") {
      return sendError(res, 409, "This payment is already voided.");
    }

    found.status = "voided";
    found.voidReason = reason.trim();
    await found.save();

    return sendSuccess(res, null, 200);
  } catch (err) {
    return sendError(res, 500, "Could not void the payment.");
  }
};