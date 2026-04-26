export const CURRENCIES = ["RUB", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type MoneyValue = {
  amount: number;
  currency: Currency;
};

export function makeMoney(amount: number, currency: Currency): MoneyValue {
  return { amount, currency };
}

export const moneyZero = (currency: Currency): MoneyValue => ({ amount: 0, currency });
