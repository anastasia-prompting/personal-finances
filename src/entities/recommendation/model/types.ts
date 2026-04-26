export const RECOMMENDATION_TYPES = [
  "period_risk",
  "fund_progress",
  "debt_progress",
  "debt_growth",
  "income_distribution",
  "overspending_warning",
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

export const RECOMMENDATION_SEVERITIES = ["info", "notice", "warn"] as const;
export type RecommendationSeverity = (typeof RECOMMENDATION_SEVERITIES)[number];

export type Recommendation = {
  id: string;
  type: RecommendationType;
  severity: RecommendationSeverity;
  text: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  isDismissed: boolean;
};
