import type { BudgetPeriod, MonthlyPlan } from "@/entities/monthly-plan/model/types";
import { newId } from "@/shared/lib/id";
import { makeBudgetPeriodRows } from "@/shared/lib/finance-engine/splitMonth";
import type { Currency } from "@/shared/lib/money";

export type BuildInitialMonthlyPlanInput = {
  year: number;
  month: number;
  plannedIncome: number;
  mandatoryPaymentsTotal: number;
  plannedFundsTotal: number;
  currency: Currency;
};

export function computeOperationalLimit(input: BuildInitialMonthlyPlanInput): number {
  const { plannedIncome, mandatoryPaymentsTotal, plannedFundsTotal } = input;
  const op = plannedIncome - mandatoryPaymentsTotal - plannedFundsTotal;
  return Math.max(0, Math.round(op * 100) / 100);
}

/**
 * Создаёт `MonthlyPlan` + 4 периода с равным распределением operationalLimit.
 */
export function buildInitialMonthlyPlan(
  input: BuildInitialMonthlyPlanInput
): { plan: MonthlyPlan; periods: BudgetPeriod[] } {
  const { year, month, currency, plannedIncome, mandatoryPaymentsTotal, plannedFundsTotal } = input;
  const operationalLimit = computeOperationalLimit(input);
  const plan: MonthlyPlan = {
    id: newId(),
    year,
    month,
    plannedIncome: Math.round(plannedIncome * 100) / 100,
    mandatoryPaymentsTotal: Math.round(mandatoryPaymentsTotal * 100) / 100,
    plannedFundsTotal: Math.round(plannedFundsTotal * 100) / 100,
    operationalLimit,
    currency,
    createdAt: new Date().toISOString(),
  };
  const periods = makeBudgetPeriodRows(year, month, plan.id, operationalLimit);
  return { plan, periods };
}
