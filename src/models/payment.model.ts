import { Schema, Types, model } from "mongoose";

export type PaymentKind = "payment" | "waiver"
export type PaymentStatus = "active" | "voided"

export interface IPayment {
  enrollmentId: Types.ObjectId
  month: string
  kind: PaymentKind
  amountLKR: number
  paidOn: Date
  receiptNo: string | null
  reason: string | null
  recordedBy: Types.ObjectId
  status: PaymentStatus
  voidReason: string | null
}

const paymentSchema = new Schema<IPayment>(
  {
    enrollmentId: { type: Schema.Types.ObjectId, ref: "enrollments", required: true },

    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    kind: { type: String, enum: ["payment", "waiver"], required: true },
    amountLKR: { type: Number, required: true, min: 0, validate: Number.isInteger },
    paidOn: { type: Date, required: true },
    receiptNo: { type: String, default: null },
    reason: { type: String, default: null },
    recordedBy: { type: Schema.Types.ObjectId, ref: "system_users", required: true },
    status: { type: String, enum: ["active", "voided"], default: "active" },
    voidReason: { type: String, default: null },
  },
  { timestamps: true }
)

// only one ACTIVE row per enrollment per month.
// A voided row is ignored by this index, so the month can be paid again after a void.
paymentSchema.index(
  { enrollmentId: 1, month: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
)

paymentSchema.index({ enrollmentId: 1, paidOn: -1 })

export const PaymentModel = model<IPayment>("payments", paymentSchema)