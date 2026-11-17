import { IClass } from "../models/class.model";

export const getFeeForMonth = (classFound: IClass, _month: string): number => {
  return classFound.monthlyFeeLKR;
};