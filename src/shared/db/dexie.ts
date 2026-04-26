import Dexie, { type Table } from "dexie";
import type { Account } from "@/entities/account/model/types";
import type { Fund } from "@/entities/fund/model/types";
import type { Credit } from "@/entities/credit/model/types";
import type { Category } from "@/entities/category/model/types";
import type { MandatoryPayment } from "@/entities/mandatory-payment/model/types";
import type { Operation } from "@/entities/operation/model/types";
import type { BudgetPeriod, MonthlyPlan } from "@/entities/monthly-plan/model/types";
import type { Recommendation } from "@/entities/recommendation/model/types";
import { DB_NAME, DB_VERSION } from "./schema";

export type AppMetaKey =
  | "onboardingComplete"
  | "primaryCurrency"
  | "recommendationStyle"
  | "snapshotV1"
  | "lastRecalcAt";

export type AppMeta = {
  key: AppMetaKey;
  value: string;
};

export class FinanceDB extends Dexie {
  appMeta!: Table<AppMeta, AppMetaKey>;
  accounts!: Table<Account, string>;
  funds!: Table<Fund, string>;
  credits!: Table<Credit, string>;
  categories!: Table<Category, string>;
  mandatoryPayments!: Table<MandatoryPayment, string>;
  operations!: Table<Operation, string>;
  monthlyPlans!: Table<MonthlyPlan, string>;
  budgetPeriods!: Table<BudgetPeriod, string>;
  recommendations!: Table<Recommendation, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      appMeta: "key",
      accounts: "id, type, currency, isMain",
      funds: "id, name, type",
      credits: "id, name, type, linkedAccountId",
      categories: "id, name, type",
      mandatoryPayments: "id, isActive, accountId, categoryId",
      operations: "id, date, type, accountId, categoryId, fundId, creditId, currency, createdAt, updatedAt",
      monthlyPlans: "id, year, month, currency",
      budgetPeriods: "id, monthlyPlanId, index, startDate, endDate, status",
      recommendations: "id, type, isDismissed, createdAt, relatedEntityId",
    });
  }
}

export const db = new FinanceDB();
