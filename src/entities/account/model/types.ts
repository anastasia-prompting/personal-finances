import type { Currency } from "@/shared/lib/money";

export const ACCOUNT_TYPES = ["debit_card", "credit_card", "cash"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  /** Для дебет/наличные: доступный остаток. Для кредитной карты: остаток до лимита (логика долга — в Credit). */
  balance: number;
  isMain: boolean;
  isCredit: boolean;
  creditLimit: number;
};
