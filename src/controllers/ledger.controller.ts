import { Request, Response } from "express";
import { HydratedDocument, isValidObjectId, Types } from "mongoose";
import { StudentModel } from "../models/student.model";
import { EnrollmentModel } from "../models/enrollment.model";
import { ClassModel, IClass } from "../models/class.model";
import { IPayment, PaymentModel } from "../models/payment.model";
import { getFeeForMonth } from "../utils/fee";
import { getCurrentMonth, listMonths } from "../utils/months";
import { sendError, sendSuccess } from "../utils/response";

type LedgerMonth = {
  month: string;
  status: "paid" | "waived" | "unpaid";
  amountLKR: number;
  paymentId: string | null;
  receiptNo: string | null;
  paidOn: Date | null;
  reason: string | null;
};

type LedgerClass = {
  enrollmentId: string;
  classId: string;
  className: string;
  subject: string;
  monthlyFeeLKR: number;
  startMonth: string;
  endMonth: string | null;
  paidLKR: number;
  outstandingLKR: number;
  unpaidMonths: number;
  months: LedgerMonth[];
};

// GET /students/:id/ledger (Tutor and Receptionist)
// Nothing is stored for the ledger. It is worked out on every request from
// the enrollments (which months are owed) and the payments (which are settled).
// Get student ledger
export const getStudentLedger = async (req: Request, res: Response) => {
  const id = req.params.id

  if (!isValidObjectId(id)) {
    return sendError(res, 404, "Student not found.")
  }

  try {
    const student = await StudentModel.findById(id)

    if (!student) {
      return sendError(res, 404, "Student not found.")
    }

    const enrollments = await EnrollmentModel.find({ studentId: id }).sort({ startMonth: 1 })
    const enrollmentIds: Types.ObjectId[] = [];
    const classIds: Types.ObjectId[] = [];

    for (const enrollment of enrollments) {
      enrollmentIds.push(enrollment._id);
      classIds.push(enrollment.classId);
    }

    const classes = await ClassModel.find({ _id: { $in: classIds } })

    // Only ACTIVE rows count. A voided row is ignored, so its month is unpaid again.
    const rows = await PaymentModel.find({
      enrollmentId: { $in: enrollmentIds },
      status: "active",
    })

    const classById = new Map<string, HydratedDocument<IClass>>();

    for (const tuitionClass of classes) {
      classById.set(tuitionClass._id.toString(), tuitionClass);
    }

    // key = enrollmentId + "|" + month, so one lookup answers "is this month settled?"
    const rowByKey = new Map<string, HydratedDocument<IPayment>>();

    for (const payment of rows) {
      const key = payment.enrollmentId.toString() + "|" + payment.month;
      rowByKey.set(key, payment);
    }

    const currentMonth = getCurrentMonth()

    let totalPaidLKR = 0
    let totalOutstandingLKR = 0
    let totalUnpaidMonths = 0

    const ledgerClasses: LedgerClass[] = [];

    for (const enrollment of enrollments) {
      const classFound = classById.get(enrollment.classId.toString())
      const lastMonth = enrollment.endMonth ?? currentMonth
      const months: LedgerMonth[] = []

      let paidLKR = 0
      let outstandingLKR = 0
      let unpaidMonths = 0

      for (const month of listMonths(enrollment.startMonth, lastMonth)) {
        const row = rowByKey.get(enrollment._id.toString() + "|" + month)

        if (row) {
          months.push({
            month,
            status: row.kind === "waiver" ? "waived" : "paid",
            amountLKR: row.amountLKR,
            paymentId: row._id.toString(),
            receiptNo: row.receiptNo,
            paidOn: row.paidOn,
            reason: row.reason,
          })
          paidLKR = paidLKR + row.amountLKR
        } else {
          // If the class is missing (it cannot be, a class with enrollments is never deleted) owe 0.
          const fee = classFound ? getFeeForMonth(classFound, month) : 0

          months.push({
            month,
            status: "unpaid",
            amountLKR: fee,
            paymentId: null,
            receiptNo: null,
            paidOn: null,
            reason: null,
          });
          outstandingLKR = outstandingLKR + fee
          unpaidMonths = unpaidMonths + 1
        }
      }

      totalPaidLKR = totalPaidLKR + paidLKR
      totalOutstandingLKR = totalOutstandingLKR + outstandingLKR
      totalUnpaidMonths = totalUnpaidMonths + unpaidMonths

      ledgerClasses.push({
        enrollmentId: enrollment._id.toString(),
        classId: enrollment.classId.toString(),
        className: classFound ? classFound.name : "Unknown class",
        subject: classFound ? classFound.subject : "",
        monthlyFeeLKR: classFound ? classFound.monthlyFeeLKR : 0,
        startMonth: enrollment.startMonth,
        endMonth: enrollment.endMonth,
        paidLKR,
        outstandingLKR,
        unpaidMonths,
        months,
      });
    }

    return sendSuccess(res, {
      student: { id: student._id.toString(), name: student.name },
      currentMonth,
      totalPaidLKR,
      totalOutstandingLKR,
      totalUnpaidMonths,
      classes: ledgerClasses,
    });
  } catch (err) {
    return sendError(res, 500, "Could not load the ledger.");
  }
};