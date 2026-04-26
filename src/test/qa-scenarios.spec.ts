import { describe, expect, it } from "vitest";
import { splitMonthIntoPeriods } from "@/shared/lib/finance-engine/splitMonth";
import { daysInMonth } from "@/shared/lib/date";
import { applyOneOperation, type ReplayState } from "@/shared/lib/finance-engine/applyOperation";
import type { Operation } from "@/entities/operation/model/types";
import type { Account } from "@/entities/account/model/types";
import { buildInitialMonthlyPlan, computeOperationalLimit } from "@/processes/build-monthly-plan";
import { parseAmount } from "@/shared/lib/validators";

const baseOp = (o: Partial<Operation> & Pick<Operation, "type" | "amount">): Operation => ({
  id: "1",
  date: "2025-01-15",
  currency: "RUB",
  comment: "",
  createdAt: "x",
  updatedAt: "x",
  accountId: null,
  categoryId: null,
  fundId: null,
  creditId: null,
  ...o,
});

describe("MVP сценарии (фрагменты)", () => {
  it("31 день — 4 периода 7/8/8/8", () => {
    const p = splitMonthIntoPeriods(2025, 1, "plan1");
    expect(p.map((x) => x.daysCount)).toEqual([7, 8, 8, 8]);
    const d = daysInMonth(2025, 1);
    expect(d).toBe(31);
  });

  it("операционный лимит: доход − обязательные − фонды", () => {
    const v = computeOperationalLimit({
      year: 2025,
      month: 1,
      plannedIncome: 100,
      mandatoryPaymentsTotal: 40,
      plannedFundsTotal: 10,
      currency: "RUB",
    });
    expect(v).toBe(50);
  });

  it("сумма валидация: отрицательные не проходят", () => {
    expect(parseAmount("-1").ok).toBe(false);
    expect(parseAmount("0").ok).toBe(false);
  });

  it("первичный план: operationalLimit = max(0, ...)", () => {
    const { plan } = buildInitialMonthlyPlan({
      year: 2025,
      month: 1,
      plannedIncome: 10,
      mandatoryPaymentsTotal: 50,
      plannedFundsTotal: 50,
      currency: "RUB",
    });
    expect(plan.operationalLimit).toBe(0);
  });

  it("расход с дебета уменьшает баланс", () => {
    const acc: Account = {
      id: "a1",
      name: "d",
      type: "debit_card",
      currency: "RUB",
      balance: 0,
      isMain: true,
      isCredit: false,
      creditLimit: 0,
    };
    const state: ReplayState = {
      accountBalances: { a1: 1000 },
      fundBalances: {},
      creditDebts: {},
    };
    const op = baseOp({
      type: "expense",
      amount: 200,
      accountId: "a1",
      categoryId: "c1",
    });
    const m = new Map<string, Account>([[acc.id, acc]]);
    applyOneOperation(op, state, m, []);
    expect(state.accountBalances.a1).toBe(800);
  });
});
