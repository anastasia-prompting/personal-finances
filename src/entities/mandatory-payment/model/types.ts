import type { Currency } from "@/shared/lib/money";

export type MandatoryPayment = {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  dueDay: number;
  categoryId: string | null;
  accountId: string | null;
  isActive: boolean;
};
