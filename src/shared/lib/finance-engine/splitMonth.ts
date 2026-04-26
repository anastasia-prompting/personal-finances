import { daysInMonth, toISODate } from "../date";
import { newId } from "../id";
import type { BudgetPeriod } from "@/entities/monthly-plan/model/types";

function periodChunks(days: number): [number, number, number, number] {
  if (days === 28) return [7, 7, 7, 7];
  if (days === 29) return [7, 7, 7, 8];
  if (days === 30) return [7, 8, 7, 8];
  if (days === 31) return [7, 8, 8, 8];
  throw new Error(`Неподдерживаемая длина месяца: ${days}`);
}

export function splitMonthIntoPeriods(
  year: number,
  month: number,
  monthlyPlanId: string
): Pick<
  BudgetPeriod,
  "startDate" | "endDate" | "daysCount" | "index" | "monthlyPlanId"
>[] {
  const dCount = daysInMonth(year, month);
  const chunks = periodChunks(dCount);
  const out: Pick<BudgetPeriod, "startDate" | "endDate" | "daysCount" | "index" | "monthlyPlanId">[] = [];
  let day = 1;
  for (let i = 0; i < 4; i += 1) {
    const len = chunks[i];
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + len - 1);
    out.push({
      monthlyPlanId,
      index: i,
      startDate: toISODate(start),
      endDate: toISODate(end),
      daysCount: len,
    });
    day += len;
  }
  return out;
}

export function makeBudgetPeriodRows(
  year: number,
  month: number,
  monthlyPlanId: string,
  operationalLimit: number
): BudgetPeriod[] {
  const base = splitMonthIntoPeriods(year, month, monthlyPlanId);
  const per = operationalLimit / 4;
  return base.map((b, i) => ({
    id: newId(),
    monthlyPlanId: b.monthlyPlanId,
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
