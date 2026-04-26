import { isDateInRange, toISODate } from "../date";
import type { BudgetPeriod, BudgetPeriodStatus, MonthlyPlan } from "@/entities/monthly-plan/model/types";
import type { Operation } from "@/entities/operation/model/types";
import { newId } from "../id";
import { splitMonthIntoPeriods } from "./splitMonth";

/**
 * Только операционные расходы: expense в валюте плана, в периоде.
 */
export function sumOperationalSpent(operations: Operation[], start: string, end: string, planCurrency: MonthlyPlan["currency"]): number {
  let s = 0;
  for (const op of operations) {
    if (op.type !== "expense") continue;
    if (op.currency !== planCurrency) continue;
    if (!isDateInRange(op.date, start, end)) continue;
    s += op.amount;
  }
  return Math.round(s * 100) / 100;
}

function daysLeftInclusiveInPeriod(today: string, start: string, end: string): number {
  if (today < start) {
    // до начала: считаем, что весь период впереди
    const d0 = new Date(start + "T00:00:00");
    const d1 = new Date(end + "T00:00:00");
    return Math.max(1, Math.round((d1.getTime() - d0.getTime()) / 86400000) + 1);
  }
  if (today > end) return 1;
  const t = new Date(today + "T00:00:00");
  const d1 = new Date(end + "T00:00:00");
  return Math.max(1, Math.round((d1.getTime() - t.getTime()) / 86400000) + 1);
}

export function derivePeriodFields(
  p: Pick<BudgetPeriod, "startDate" | "endDate" | "daysCount" | "limitAmount" | "spentAmount">,
  _planCurrency: MonthlyPlan["currency"],
  today: string
): {
  spentAmount: number;
  remainingAmount: number;
  dailyTarget: number;
  dailyRemainingTarget: number;
  status: BudgetPeriodStatus;
} {
  const { limitAmount, daysCount, startDate, endDate, spentAmount } = p;
  const dailyTarget = daysCount > 0 ? limitAmount / daysCount : 0;
  const remaining = limitAmount - spentAmount;
  const daysLeft = daysLeftInclusiveInPeriod(today, startDate, endDate);
  const dailyRem = daysLeft > 0 ? remaining / daysLeft : remaining;
  const status = evaluateStatus({ dailyTarget, dailyRem, remaining, daysLeft, spentAmount, limitAmount });
  return {
    spentAmount,
    remainingAmount: Math.round(remaining * 100) / 100,
    dailyTarget: Math.round(dailyTarget * 100) / 100,
    dailyRemainingTarget: Math.round(dailyRem * 100) / 100,
    status,
  };
}

function evaluateStatus(args: {
  dailyTarget: number;
  dailyRem: number;
  remaining: number;
  daysLeft: number;
  spentAmount: number;
  limitAmount: number;
}): BudgetPeriodStatus {
  const { dailyTarget, dailyRem, remaining, daysLeft, spentAmount, limitAmount } = args;
  if (remaining < 0) return "risk";
  if (daysLeft > 0 && dailyTarget > 0) {
    if (dailyRem < dailyTarget * 0.6) return "risk";
    if (dailyRem < dailyTarget * 0.9) return "attention";
  }
  if (limitAmount > 0 && spentAmount > limitAmount * 1.12) return "attention";
  return "ok";
}

/**
 * Создать/обновить 4 периода для плана (если периоды уже есть — обновит лимиты и даты).
 */
export function alignBudgetPeriodsWithPlan(
  plan: MonthlyPlan,
  existing: BudgetPeriod[] | undefined,
  year: number,
  month: number
): BudgetPeriod[] {
  const pieces = splitMonthIntoPeriods(year, month, plan.id);
  const per = plan.operationalLimit / 4;
  if (!existing || existing.length !== 4) {
    return pieces.map((b, i) => ({
      id: newId(),
      monthlyPlanId: plan.id,
      index: i,
      startDate: b.startDate,
      endDate: b.endDate,
      daysCount: b.daysCount,
      limitAmount: Math.round(per * 100) / 100,
      spentAmount: 0,
      remainingAmount: 0,
      dailyTarget: 0,
      dailyRemainingTarget: 0,
      status: "ok" as const,
    }));
  }
  return existing
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((e, i) => ({
      ...e,
      startDate: pieces[i]!.startDate,
      endDate: pieces[i]!.endDate,
      daysCount: pieces[i]!.daysCount,
      limitAmount: Math.round(per * 100) / 100,
    }));
}

export const periodHelpers = {
  toISODate: () => toISODate(new Date()),
};
