import type { Account } from "@/entities/account/model/types";
import type { Credit } from "@/entities/credit/model/types";
import type { ReplayState } from "./applyOperation";

export function syncCreditCardAvailableBalances(accounts: Account[], credits: Credit[], state: ReplayState): void {
  for (const a of accounts) {
    if (!a.isCredit || a.type !== "credit_card") continue;
    const c = credits.find((x) => x.linkedAccountId === a.id);
    if (!c) continue;
    const debt = state.creditDebts[c.id] ?? 0;
    const available = Math.max(0, a.creditLimit - debt);
    state.accountBalances[a.id] = Math.round(available * 100) / 100;
  }
}
