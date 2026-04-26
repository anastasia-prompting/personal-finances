import { buildInitialMonthlyPlan } from "@/processes/build-monthly-plan";
import { recalculateAll } from "@/processes/recalculate-finance-state";
import { db } from "@/shared/db/dexie";
import type { OnboardingSnapshot } from "@/shared/db/onboarding-snapshot";
import { newId } from "@/shared/lib/id";
import type { Account, AccountType } from "@/entities/account/model/types";
import type { Credit } from "@/entities/credit/model/types";
import type { Fund, FundType } from "@/entities/fund/model/types";
import type { MandatoryPayment } from "@/entities/mandatory-payment/model/types";
import type { BudgetPeriod, MonthlyPlan } from "@/entities/monthly-plan/model/types";
import type { Currency } from "@/shared/lib/money";

export type OnboardingInput = {
  averageMonthlyIncome: number;
  planCurrency: Currency;
  /** До 5 карт + отдельно учитываем наличные. */
  cards: { name: string; type: AccountType; balance: number; currency: Currency; isCredit: boolean; creditLimit: number; currentDebt: number }[];
  cash: { name: string; amount: number; currency: Currency };
  mandatory: { name: string; amount: number; dueDay: number; currency: Currency }[];
  funds: { name: string; type: FundType; targetAmount: number; limitAmount: number; plannedIncomePercent: number; isMarketplaceWallet: boolean }[];
  recommendationStyle: "soft" | "neutral" | "strict";
};

function plannedFundsFromIncome(income: number, funds: OnboardingInput["funds"]): number {
  let s = 0;
  for (const f of funds) s += (income * f.plannedIncomePercent) / 100;
  return Math.max(0, Math.round(s * 100) / 100);
}

/**
 * Сохраняет сущности, план, снимок и пересчитывает состояние.
 */
export async function completeOnboarding(data: OnboardingInput): Promise<void> {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const accounts: Account[] = [];
  const credits: Credit[] = [];
  const funds: Fund[] = [];
  const mandatory: MandatoryPayment[] = [];
  const snapshot: OnboardingSnapshot = { version: 1, accountBalances: {}, fundBalances: {}, creditDebts: {} };

  let mainSet = false;
  for (const c of data.cards) {
    const id = newId();
    const isFirstDebit = c.type === "debit_card" && !c.isCredit;
    let isMain = false;
    if (isFirstDebit && !mainSet) {
      isMain = true;
      mainSet = true;
    }
    const acc: Account = {
      id,
      name: c.name,
      type: c.type,
      currency: c.currency,
      isCredit: c.isCredit,
      creditLimit: c.isCredit ? c.creditLimit : 0,
      isMain,
      balance: 0,
    };
    if (c.isCredit && c.type === "credit_card") {
      const available = Math.max(0, c.creditLimit - c.currentDebt);
      acc.balance = available;
      const cr: Credit = {
        id: newId(),
        name: c.name,
        type: "credit_card",
        currency: c.currency,
        currentDebt: c.currentDebt,
        interestRate: 0,
        minimumPayment: 0,
        comfortablePayment: 0,
        linkedAccountId: acc.id,
        createdAt: new Date().toISOString(),
      };
      snapshot.creditDebts[cr.id] = c.currentDebt;
      snapshot.accountBalances[acc.id] = available;
      credits.push(cr);
    } else {
      acc.balance = c.balance;
      snapshot.accountBalances[acc.id] = c.balance;
    }
    accounts.push(acc);
  }
  {
    const id = newId();
    const acc: Account = {
      id,
      name: data.cash.name || "Наличные",
      type: "cash",
      currency: data.cash.currency,
      isCredit: false,
      isMain: !mainSet,
      creditLimit: 0,
      balance: data.cash.amount,
    };
    if (!mainSet) mainSet = true;
    accounts.push(acc);
    snapshot.accountBalances[acc.id] = data.cash.amount;
  }

  for (const f of data.funds) {
    const id = newId();
    const row: Fund = {
      id,
      name: f.name,
      type: f.isMarketplaceWallet ? "marketplace_wallet" : f.type,
      targetAmount: f.targetAmount,
      currentBalance: 0,
      limitAmount: f.limitAmount,
      deadline: null,
      plannedIncomePercent: f.plannedIncomePercent,
      isMarketplaceWallet: f.isMarketplaceWallet,
      createdAt: new Date().toISOString(),
    };
    funds.push(row);
    snapshot.fundBalances[row.id] = 0;
  }

  for (const m of data.mandatory) {
    const id = newId();
    mandatory.push({
      id,
      name: m.name,
      amount: m.amount,
      currency: m.currency,
      dueDay: m.dueDay,
      categoryId: null,
      accountId: null,
      isActive: true,
    });
  }

  const mandatoryTotal = data.mandatory.filter((m) => m.currency === data.planCurrency).reduce((a, b) => a + b.amount, 0);
  const plannedFundsTotal = plannedFundsFromIncome(data.averageMonthlyIncome, data.funds);
  const { plan, periods } = buildInitialMonthlyPlan({
    year,
    month,
    plannedIncome: data.averageMonthlyIncome,
    mandatoryPaymentsTotal: mandatoryTotal,
    plannedFundsTotal,
    currency: data.planCurrency,
  });

  const monthlyPlan: MonthlyPlan = plan;
  const budgetRows: BudgetPeriod[] = periods;

  await db.transaction(
    "rw",
    [db.appMeta, db.accounts, db.funds, db.credits, db.mandatoryPayments, db.monthlyPlans, db.budgetPeriods],
    async () => {
    if (accounts.length) await db.accounts.bulkAdd(accounts);
    if (funds.length) await db.funds.bulkAdd(funds);
    if (credits.length) await db.credits.bulkAdd(credits);
    if (mandatory.length) await db.mandatoryPayments.bulkAdd(mandatory);
    await db.monthlyPlans.add(monthlyPlan);
    if (budgetRows.length) await db.budgetPeriods.bulkAdd(budgetRows);
    await db.appMeta.bulkPut([
      { key: "onboardingComplete", value: "1" },
      { key: "primaryCurrency", value: data.planCurrency },
      { key: "recommendationStyle", value: data.recommendationStyle },
      { key: "snapshotV1", value: JSON.stringify(snapshot) },
    ]);
    }
  );
  await recalculateAll();
}
