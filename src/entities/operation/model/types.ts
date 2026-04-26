import type { Currency } from "@/shared/lib/money";

export const OPERATION_TYPES = [
  "income",
  "expense",
  "transfer_to_fund",
  "expense_from_fund",
  "credit_payment",
  "debt_increase",
] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

export type Operation = {
  id: string;
  date: string;
  type: OperationType;
  amount: number;
  currency: Currency;
  accountId: string | null;
  categoryId: string | null;
  fundId: string | null;
  creditId: string | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
};
