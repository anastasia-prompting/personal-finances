import type { Currency } from "./money";

export function parseAmount(input: string): { ok: true; value: number } | { ok: false; error: string } {
  const t = input.trim().replace(/\s/g, "").replace(",", ".");
  if (t.length === 0) return { ok: false, error: "Введите сумму" };
  const n = Number(t);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return { ok: false, error: "Некорректное число" };
  }
  if (n <= 0) return { ok: false, error: "Сумма должна быть больше нуля" };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

export function isValidAmount(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function isCurrency(s: string): s is Currency {
  return s === "RUB" || s === "USD" || s === "EUR";
}
