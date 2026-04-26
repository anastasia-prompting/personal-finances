import type { Currency } from "@/shared/lib/money";

export type MonthlyPlan = {
  id: string;
  month: number;
  year: number;
  plannedIncome: number;
  mandatoryPaymentsTotal: number;
  plannedFundsTotal: number;
  operationalLimit: number;
  currency: Currency;
  createdAt: string;
};

export const BUDGET_PERIOD_STATUSES = ["ok", "attention", "risk"] as const;
export type BudgetPeriodStatus = (typeof BUDGET_PERIOD_STATUSES)[number];

export type BudgetPeriod = {
  id: string;
  monthlyPlanId: string;
  index: number;
  startDate: string;
  endDate: string;
  daysCount: number;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  dailyTarget: number;
  dailyRemainingTarget: number;
  status: BudgetPeriodStatus;
};
