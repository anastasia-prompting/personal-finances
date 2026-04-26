import type { Account } from "@/entities/account/model/types";
import type { Credit } from "@/entities/credit/model/types";
import type { Operation } from "@/entities/operation/model/types";

export type ReplayState = {
  accountBalances: Record<string, number>;
  fundBalances: Record<string, number>;
  creditDebts: Record<string, number>;
};

function findCreditIdByAccountId(credits: Credit[], accountId: string | null): string | null {
  if (!accountId) return null;
  const c = credits.find((x) => x.linkedAccountId === accountId);
  return c ? c.id : null;
}

function isCreditCardAccount(accounts: Map<string, Account>, accountId: string): boolean {
  const a = accounts.get(accountId);
  return !!a && a.isCredit && a.type === "credit_card";
}

/**
 * Мутирует state — применяет одну операцию. Порядок: от старых к новым.
 */
export function applyOneOperation(
  op: Operation,
  state: ReplayState,
  accounts: Map<string, Account>,
  credits: Credit[]
): void {
  const amt = op.amount;
  if (!(amt > 0)) return;

  switch (op.type) {
    case "income": {
      if (!op.accountId) break;
      if (isCreditCardAccount(accounts, op.accountId)) {
        const cid = findCreditIdByAccountId(credits, op.accountId);
        if (cid) state.creditDebts[cid] = Math.max(0, (state.creditDebts[cid] ?? 0) - amt);
      } else {
        state.accountBalances[op.accountId] = (state.accountBalances[op.accountId] ?? 0) + amt;
      }
      break;
    }
    case "expense": {
      if (!op.accountId) break;
      if (isCreditCardAccount(accounts, op.accountId)) {
        const cid = findCreditIdByAccountId(credits, op.accountId);
        if (cid) state.creditDebts[cid] = (state.creditDebts[cid] ?? 0) + amt;
      } else {
        state.accountBalances[op.accountId] = (state.accountBalances[op.accountId] ?? 0) - amt;
      }
      break;
    }
    case "transfer_to_fund": {
      if (!op.accountId || !op.fundId) break;
      if (isCreditCardAccount(accounts, op.accountId)) {
        const cid = findCreditIdByAccountId(credits, op.accountId);
        if (cid) state.creditDebts[cid] = (state.creditDebts[cid] ?? 0) + amt;
      } else {
        state.accountBalances[op.accountId] = (state.accountBalances[op.accountId] ?? 0) - amt;
      }
      state.fundBalances[op.fundId] = (state.fundBalances[op.fundId] ?? 0) + amt;
      break;
    }
    case "expense_from_fund": {
      if (!op.fundId) break;
      state.fundBalances[op.fundId] = (state.fundBalances[op.fundId] ?? 0) - amt;
      break;
    }
    case "credit_payment": {
      if (!op.accountId || !op.creditId) break;
      state.accountBalances[op.accountId] = (state.accountBalances[op.accountId] ?? 0) - amt;
      state.creditDebts[op.creditId] = Math.max(0, (state.creditDebts[op.creditId] ?? 0) - amt);
      break;
    }
    case "debt_increase": {
      if (!op.creditId) break;
      state.creditDebts[op.creditId] = (state.creditDebts[op.creditId] ?? 0) + amt;
      break;
    }
    default: {
      const _e: never = op.type;
      void _e;
    }
  }
}

export function assertOperationValid(op: Operation): void {
  const { type, accountId, categoryId, fundId, creditId, amount } = op;
  if (!(Number.isFinite(amount) && amount > 0)) throw new Error("Сумма должна быть > 0");
  switch (type) {
    case "income":
    case "expense": {
      if (!accountId) throw new Error("Счёт обязателен");
      if (!categoryId) throw new Error("Категория обязательна");
      return;
    }
    case "transfer_to_fund": {
      if (!accountId) throw new Error("Счёт обязателен");
      if (!fundId) throw new Error("Фонд обязателен");
      return;
    }
    case "expense_from_fund": {
      if (!fundId) throw new Error("Фонд обязателен");
      return;
    }
    case "credit_payment": {
      if (!accountId) throw new Error("Счёт обязателен");
      if (!creditId) throw new Error("Кредит обязателен");
      return;
    }
    case "debt_increase": {
      if (!creditId) throw new Error("Кредит обязателен");
      return;
    }
    default: {
      const _x: never = type;
      void _x;
    }
  }
}
