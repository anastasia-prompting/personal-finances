import type { Category } from "@/entities/category/model/types";
import { newId } from "@/shared/lib/id";
import { db } from "./dexie";

const EXPENSE_NAMES = [
  "ЖКХ, налоги, телефоны, интернет",
  "Дети",
  "Продукты, еда вне дома",
  "Бытовая химия, товары для дома",
  "Красота, здоровье",
  "Одежда, обувь, аксессуары",
  "Разное и форс-мажор",
  "Транспорт, авто",
  "Подарки и благотворительность",
  "Хочушки-удовольствия",
];

const INCOME_NAMES = [
  "Зарплата",
  "Аренда",
  "Алименты",
  "Пособия",
  "Фриланс",
  "Продажа вещей",
  "Подарок",
  "Проценты и доход на остаток",
  "Кэшбэк / бонусы",
];

export async function ensureDefaultCategories(): Promise<void> {
  const n = await db.categories.count();
  if (n > 0) return;

  const rows: Category[] = [
    ...EXPENSE_NAMES.map((name) => ({
      id: newId(),
      name,
      type: "expense" as const,
      isRequired: true,
    })),
    ...INCOME_NAMES.map((name) => ({
      id: newId(),
      name,
      type: "income" as const,
      isRequired: true,
    })),
    {
      id: newId(),
      name: "Кредит / долг",
      type: "credit",
      isRequired: false,
    },
  ];

  await db.categories.bulkAdd(rows);
}
