/** Снимок остатков после диагностики для полного пересчёта из журнала операций. */
export type OnboardingSnapshot = {
  version: 1;
  accountBalances: Record<string, number>;
  fundBalances: Record<string, number>;
  creditDebts: Record<string, number>;
};
