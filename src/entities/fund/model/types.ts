export const FUND_TYPES = ["regular", "goal", "marketplace_wallet"] as const;
export type FundType = (typeof FUND_TYPES)[number];

export type Fund = {
  id: string;
  name: string;
  type: FundType;
  targetAmount: number;
  currentBalance: number;
  limitAmount: number;
  deadline: string | null;
  plannedIncomePercent: number;
  isMarketplaceWallet: boolean;
  createdAt: string;
};
