import { Schema, model } from "mongoose";

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface IClass {
  name: string;
  subject: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  monthlyFeeLKR: number;
  active: boolean;
}

const classSchema = new Schema<IClass>(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    dayOfWeek: { type: String, enum: DAYS_OF_WEEK, required: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    monthlyFeeLKR: { type: Number, required: true, min: 1, validate: Number.isInteger },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

classSchema.index({ name: 1 });

export const ClassModel = model<IClass>("classes", classSchema);