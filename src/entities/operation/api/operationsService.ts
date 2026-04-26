import { db } from "@/shared/db/dexie";
import { newId } from "@/shared/lib/id";
import { assertOperationValid } from "@/shared/lib/finance-engine/applyOperation";
import { recalculateAll } from "@/processes/recalculate-finance-state";
import type { Operation, OperationType } from "../model/types";
import type { Currency } from "@/shared/lib/money";

export type NewOperation = Omit<Operation, "id" | "createdAt" | "updatedAt"> & { id?: string };

function nil<T>(v: T | null | undefined): T | null {
  return v === undefined ? null : v;
}

export async function addOperation(partial: NewOperation): Promise<Operation> {
  const id = partial.id ?? newId();
  const now = new Date().toISOString();
  const op: Operation = {
    ...partial,
    id,
    accountId: nil(partial.accountId),
    categoryId: nil(partial.categoryId),
    fundId: nil(partial.fundId),
    creditId: nil(partial.creditId),
    comment: partial.comment ?? "",
    createdAt: now,
    updatedAt: now,
  };
  assertOperationValid(op);
  await db.operations.add(op);
  await recalculateAll();
  return op;
}

export async function updateOperation(id: string, partial: Partial<Omit<Operation, "id" | "createdAt">>): Promise<void> {
  const prev = await db.operations.get(id);
  if (!prev) throw new Error("Операция не найдена");
  const now = new Date().toISOString();
  const m = { ...prev, ...partial, id, updatedAt: now };
  const op: Operation = {
    ...m,
    accountId: nil(m.accountId),
    categoryId: nil(m.categoryId),
    fundId: nil(m.fundId),
    creditId: nil(m.creditId),
  };
  assertOperationValid(op);
  await db.operations.put(op);
  await recalculateAll();
}

export async function deleteOperation(id: string): Promise<void> {
  await db.operations.delete(id);
  await recalculateAll();
}

export function getOperationTypeLabel(t: OperationType): string {
  const map: Record<OperationType, string> = {
    income: "Доход",
    expense: "Расход",
    transfer_to_fund: "Перевод в фонд",
    expense_from_fund: "Расход из фонда",
    credit_payment: "Платёж по кредиту",
    debt_increase: "Увеличение долга",
  };
  return map[t];
}

export { type Currency };
