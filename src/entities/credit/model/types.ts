import type { Currency } from "@/shared/lib/money";

export const CREDIT_TYPES = ["credit_card", "loan"] as const;
export type CreditType = (typeof CREDIT_TYPES)[number];

export type Credit = {
  id: string;
  name: string;
  type: CreditType;
  /** Валюта отображения долга (MVP; для консистентности с планом). */
  currency: Currency;
  currentDebt: number;
  interestRate: number;
  minimumPayment: number;
  comfortablePayment: number;
  linkedAccountId: string | null;
  createdAt: string;
};
