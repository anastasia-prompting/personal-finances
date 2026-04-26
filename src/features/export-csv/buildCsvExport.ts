import type { Fund } from "@/entities/fund/model/types";
import type { Credit } from "@/entities/credit/model/types";
import type { Operation } from "@/entities/operation/model/types";
import type { BudgetPeriod, MonthlyPlan } from "@/entities/monthly-plan/model/types";

function esc(s: string | number | boolean | null | undefined): string {
  const t = s == null ? "" : String(s);
  if (t.includes('"') || t.includes(",") || t.includes("\n")) {
    return `"${t.replace(/"/g, '""')}"`;
  }
  return t;
}

function toCsv<T extends object>(rows: T[], keys: (keyof T)[]): string {
  const header = keys.map((k) => String(k)).join(",") + "\n";
  const body = rows
    .map((r) => keys.map((k) => esc(r[k] as string | number | boolean | null | undefined)).join(","))
    .join("\n");
  return header + (body ? body + "\n" : "");
}

export function buildOperationsCsv(operations: Operation[]): string {
  if (operations.length === 0) return "id,date,type,amount,currency,accountId,categoryId,fundId,creditId,comment\n";
  return toCsv(operations, [
    "id",
    "date",
    "type",
    "amount",
    "currency",
    "accountId",
    "categoryId",
    "fundId",
    "creditId",
    "comment",
  ] as (keyof Operation)[]);
}

export function buildFundsCsv(funds: Fund[]): string {
  if (funds.length === 0) return "id,name,type,targetAmount,currentBalance,limitAmount,plannedIncomePercent,createdAt\n";
  return toCsv(funds, [
    "id",
    "name",
    "type",
    "targetAmount",
    "currentBalance",
    "limitAmount",
    "plannedIncomePercent",
    "createdAt",
  ] as (keyof Fund)[]);
}

export function buildCreditsCsv(credits: Credit[]): string {
  if (credits.length === 0) return "id,name,type,currency,currentDebt,interestRate,minimumPayment,comfortablePayment,linkedAccountId,createdAt\n";
  return toCsv(credits, [
    "id",
    "name",
    "type",
    "currency",
    "currentDebt",
    "interestRate",
    "minimumPayment",
    "comfortablePayment",
    "linkedAccountId",
    "createdAt",
  ] as (keyof Credit)[]);
}

export function buildPlansCsv(
  plans: MonthlyPlan[],
  periods: { planId: string; period: BudgetPeriod }[]
): string {
  const p = toCsv(plans, [
    "id",
    "year",
    "month",
    "plannedIncome",
    "mandatoryPaymentsTotal",
    "plannedFundsTotal",
    "operationalLimit",
    "currency",
    "createdAt",
  ] as (keyof MonthlyPlan)[]);
  if (periods.length === 0) return p + "\n# periods\n" + "planId,periodId,index,startDate,endDate,limit,spent,status\n";
  const h =
    "planId,periodId,index,startDate,endDate,limit,spent,remaining,dailyTarget,dailyRemaining,status\n";
  const b = periods
    .map(
      ({ planId, period: x }) =>
        [planId, x.id, x.index, x.startDate, x.endDate, x.limitAmount, x.spentAmount, x.remainingAmount, x.dailyTarget, x.dailyRemainingTarget, x.status]
          .map(esc)
          .join(",")
    )
    .join("\n");
  return p + "\n# periods\n" + h + b + "\n";
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
