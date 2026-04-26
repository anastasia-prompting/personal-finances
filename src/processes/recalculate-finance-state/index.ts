import { db } from "@/shared/db/dexie";
import type { OnboardingSnapshot } from "@/shared/db/onboarding-snapshot";
import { applyOneOperation, type ReplayState } from "@/shared/lib/finance-engine/applyOperation";
import { sumOperationalSpent, derivePeriodFields, alignBudgetPeriodsWithPlan } from "@/shared/lib/finance-engine/periodMetrics";
import { syncCreditCardAvailableBalances } from "@/shared/lib/finance-engine/syncCredit";
import { toISODate } from "@/shared/lib/date";
import { newId } from "@/shared/lib/id";
import type { Credit } from "@/entities/credit/model/types";
import type { Fund } from "@/entities/fund/model/types";
import type { BudgetPeriod, MonthlyPlan } from "@/entities/monthly-plan/model/types";
import type { Operation } from "@/entities/operation/model/types";
import type { Recommendation } from "@/entities/recommendation/model/types";
import { estimatePayoffMonths } from "@/shared/lib/finance-engine/estimate";
import { formatMoney } from "@/shared/lib/currency";

function sortOps(ops: Operation[]): Operation[] {
  return [...ops].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}

function parseSnapshot(s: string | undefined | null): OnboardingSnapshot {
  if (!s) {
    return { version: 1, accountBalances: {}, fundBalances: {}, creditDebts: {} };
  }
  try {
    return JSON.parse(s) as OnboardingSnapshot;
  } catch {
    return { version: 1, accountBalances: {}, fundBalances: {}, creditDebts: {} };
  }
}

async function recomputePlanPeriods(operations: Operation[], today: string) {
  const plans = await db.monthlyPlans.toArray();
  for (const plan of plans) {
    const allPeriods = await db.budgetPeriods.where("monthlyPlanId").equals(plan.id).toArray();
    const aligned = alignBudgetPeriodsWithPlan(plan, allPeriods, plan.year, plan.month);
    const byId = new Map(allPeriods.map((p) => [p.id, p] as const));
    const toSave: BudgetPeriod[] = aligned.map((p) => {
      const prev = p.id && byId.get(p.id);
      if (prev) {
        return { ...prev, ...p, id: prev.id, monthlyPlanId: plan.id };
      }
      return p;
    });
    await db.budgetPeriods.where("monthlyPlanId").equals(plan.id).delete();
    for (const per of toSave) {
      const spent = sumOperationalSpent(operations, per.startDate, per.endDate, plan.currency);
      const d = derivePeriodFields(
        { ...per, spentAmount: spent, limitAmount: per.limitAmount, daysCount: per.daysCount, startDate: per.startDate, endDate: per.endDate },
        plan.currency,
        today
      );
      const row: BudgetPeriod = {
        ...per,
        spentAmount: d.spentAmount,
        remainingAmount: d.remainingAmount,
        dailyTarget: d.dailyTarget,
        dailyRemainingTarget: d.dailyRemainingTarget,
        status: d.status,
      };
      await db.budgetPeriods.put(row);
    }
  }
}

function buildRecs(
  plan: MonthlyPlan | undefined,
  currentPeriod: BudgetPeriod | undefined,
  credits: Credit[],
  funds: Fund[]
): Recommendation[] {
  const out: Recommendation[] = [];
  const t = new Date().toISOString();
  if (currentPeriod && (currentPeriod.status === "risk" || currentPeriod.status === "attention") && plan) {
    out.push({
      id: newId(),
      type: "period_risk",
      severity: currentPeriod.status === "risk" ? "warn" : "notice",
      text: `Период ${currentPeriod.index + 1}: осталось ${formatMoney(currentPeriod.remainingAmount, plan.currency).replace(/\s+/, " ")}. Сейчас ≈${formatMoney(currentPeriod.dailyRemainingTarget, plan.currency)}/день вместо плановых ${formatMoney(currentPeriod.dailyTarget, plan.currency)}/день. Можно замедлиться или мягко пересчитать план — без жёсткого запрета.`,
      relatedEntityType: "budgetPeriod",
      relatedEntityId: currentPeriod.id,
      createdAt: t,
      isDismissed: false,
    });
  }
  for (const c of credits) {
    const m = estimatePayoffMonths(c.currentDebt, c.comfortablePayment);
    if (c.currentDebt > 0 && m != null) {
      out.push({
        id: newId(),
        type: "debt_progress",
        severity: "info",
        text: `Долг «${c.name}»: сейчас ${formatMoney(c.currentDebt, c.currency).replace(/\s+/, " ")}. При комфортном платеже ≈${c.comfortablePayment} срок ≈${m} мес. Это ориентир, не приговор.`,
        relatedEntityType: "credit",
        relatedEntityId: c.id,
        createdAt: t,
        isDismissed: false,
      });
    }
  }
  for (const f of funds) {
    if (f.type === "goal" && f.targetAmount > 0) {
      const p = f.currentBalance / f.targetAmount;
      if (p >= 0.85) {
        out.push({
          id: newId(),
          type: "fund_progress",
          severity: "notice",
          text: `Фонд «${f.name}» почти у цели (${Math.round(p * 100)}%). Можно чуть усилить и закрыть раньше.`,
          relatedEntityType: "fund",
          relatedEntityId: f.id,
          createdAt: t,
          isDismissed: false,
        });
      }
    }
  }
  return out;
}

/**
 * Полный пересчёт: балансы → периоды → рекомендации.
 */
export async function recalculateAll(): Promise<void> {
  const [metaRow, accounts, funds, credits, allOps, plans] = await Promise.all([
    db.appMeta.get("snapshotV1"),
    db.accounts.toArray(),
    db.funds.toArray(),
    db.credits.toArray(),
    db.operations.toArray(),
    db.monthlyPlans.toArray(),
  ]);
  const snapshot = parseSnapshot(metaRow?.value);
  const sorted = sortOps(allOps);
  const accountsMap = new Map(accounts.map((a) => [a.id, a] as const));

  const state: ReplayState = {
    accountBalances: { ...snapshot.accountBalances },
    fundBalances: { ...snapshot.fundBalances },
    creditDebts: { ...snapshot.creditDebts },
  };
  for (const a of accounts) {
    if (a.isCredit) continue;
    if (state.accountBalances[a.id] == null) state.accountBalances[a.id] = 0;
  }
  for (const f of funds) {
    if (state.fundBalances[f.id] == null) state.fundBalances[f.id] = 0;
  }
  for (const c of credits) {
    if (state.creditDebts[c.id] == null) state.creditDebts[c.id] = 0;
  }
  syncCreditCardAvailableBalances(accounts, credits, state);
  for (const op of sorted) {
    applyOneOperation(op, state, accountsMap, credits);
  }
  syncCreditCardAvailableBalances(accounts, credits, state);

  await db.transaction("rw", db.accounts, db.funds, db.credits, async () => {
    for (const a of accounts) {
      const bal = state.accountBalances[a.id] ?? 0;
      await db.accounts.update(a.id, { balance: bal });
    }
    for (const f of funds) {
      const b = state.fundBalances[f.id] ?? 0;
      await db.funds.update(f.id, { currentBalance: b });
    }
    for (const c of credits) {
      const d = state.creditDebts[c.id] ?? 0;
      await db.credits.update(c.id, { currentDebt: Math.round(d * 100) / 100 });
    }
  });

  const today = toISODate(new Date());
  await recomputePlanPeriods(allOps, today);

  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const plan = plans.find((p) => p.year === y && p.month === m);
  const planPeriods = plan ? await db.budgetPeriods.where("monthlyPlanId").equals(plan.id).toArray() : [];
  const currentPeriod = planPeriods.find((b) => b.startDate <= today && b.endDate >= today);
  const fundRows = await db.funds.toArray();
  const recs = buildRecs(plan, currentPeriod, await db.credits.toArray(), fundRows);
  await db.recommendations.clear();
  if (recs.length) await db.recommendations.bulkAdd(recs);
  await db.appMeta.put({ key: "lastRecalcAt", value: new Date().toISOString() });
}
