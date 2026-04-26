import type { Currency } from "./money";

const map: Record<Currency, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
};

export function formatMoney(amount: number, currency: Currency, locale = "ru-RU"): string {
  const sign = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${sign.format(amount)} ${map[currency]}`;
}

export function shortCurrency(c: Currency): string {
  return map[c];
}
