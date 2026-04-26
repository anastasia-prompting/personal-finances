export const CATEGORY_SCOPE = ["income", "expense", "credit"] as const;
export type CategoryScope = (typeof CATEGORY_SCOPE)[number];

export type Category = {
  id: string;
  name: string;
  type: CategoryScope;
  isRequired: boolean;
};
