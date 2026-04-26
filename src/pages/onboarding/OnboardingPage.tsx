import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeOnboarding } from "@/features/onboarding/completeOnboarding";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import type { AccountType } from "@/entities/account/model/types";
import type { FundType } from "@/entities/fund/model/types";
import type { Currency } from "@/shared/lib/money";
import { CURRENCIES } from "@/shared/lib/money";
import { parseAmount } from "@/shared/lib/validators";

type CardRow = {
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  isCredit: boolean;
  creditLimit: number;
  currentDebt: number;
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [income, setIncome] = useState("80000");
  const [planCurrency, setPlanCurrency] = useState<Currency>("RUB");
  const [cards, setCards] = useState<CardRow[]>([
    { name: "Основная карта", type: "debit_card", currency: "RUB", balance: 0, isCredit: false, creditLimit: 0, currentDebt: 0 },
  ]);
  const [cash, setCash] = useState("5000");
  const [cashCur, setCashCur] = useState<Currency>("RUB");
  const [mandatory, setMandatory] = useState<{ name: string; amount: string; dueDay: string; currency: Currency }[]>([]);
  const [funds, setFunds] = useState<{ name: string; type: FundType; target: string; limit: string; pct: string; mp: boolean }[]>([
    { name: "Подушка безопасности", type: "regular", target: "200000", limit: "0", pct: "10", mp: false },
  ] as { name: string; type: FundType; target: string; limit: string; pct: string; mp: boolean }[]);
  const [style, setStyle] = useState<"soft" | "neutral" | "strict">("soft");

  async function submit() {
    setErr(null);
    const inc = parseAmount(income);
    if (!inc.ok) {
      setErr(inc.error);
      return;
    }
    const cashNum = parseAmount(cash);
    if (!cashNum.ok) {
      setErr("Наличные: " + cashNum.error);
      return;
    }
    if (cards.length > 5) {
      setErr("Не больше 5 карт");
      return;
    }
    setLoading(true);
    try {
      await completeOnboarding({
        averageMonthlyIncome: inc.value,
        planCurrency,
        cards: cards.map((c) => ({
          name: c.name,
          type: c.type,
          currency: c.currency,
          balance: c.balance,
          isCredit: c.isCredit,
          creditLimit: c.creditLimit,
          currentDebt: c.currentDebt,
        })),
        cash: { name: "Наличные", amount: cashNum.value, currency: cashCur },
        mandatory: mandatory.map((m) => {
          const a = parseAmount(m.amount);
          if (!a.ok) throw new Error(m.name + ": " + a.error);
          const d = Number(m.dueDay);
          return { name: m.name, amount: a.value, dueDay: Number.isFinite(d) ? Math.min(31, Math.max(1, d)) : 1, currency: m.currency };
        }),
        funds: funds.map((f) => {
          const t = Number(f.target);
          const l = Number(f.limit);
          const p = Number(f.pct);
          return {
            name: f.name,
            type: f.type,
            targetAmount: Number.isFinite(t) ? t : 0,
            limitAmount: Number.isFinite(l) ? l : 0,
            plannedIncomePercent: Number.isFinite(p) ? p : 0,
            isMarketplaceWallet: f.mp,
          };
        }),
        recommendationStyle: style,
      });
      void navigate("/", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 py-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-100">Стартовая настройка</h1>
        <p className="mt-1 text-sm text-slate-400">Спокойно, без анкеты навсегда. Можно пропускать необязательное в следующих версиях — сейчас заполни минимум.</p>
      </header>

      <Card title="Доход и валюта плана">
        <label className="block text-xs text-slate-500">Средний месячный доход</label>
        <input
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          inputMode="decimal"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
        <label className="mt-3 block text-xs text-slate-500">Валюта плана</label>
        <select
          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          value={planCurrency}
          onChange={(e) => setPlanCurrency(e.target.value as Currency)}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Card>

      <Card title="Карты (до 5)">
        {cards.map((c, i) => (
          <div key={i} className="mb-3 rounded-xl border border-slate-800 p-3">
            <input
              className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              placeholder="Название"
              value={c.name}
              onChange={(e) => {
                const n = [...cards];
                n[i]!.name = e.target.value;
                setCards(n);
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                value={c.type}
                onChange={(e) => {
                  const n = [...cards];
                  n[i]!.type = e.target.value as AccountType;
                  setCards(n);
                }}
              >
                <option value="debit_card">Дебет</option>
                <option value="credit_card">Кредит</option>
              </select>
              <select
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                value={c.currency}
                onChange={(e) => {
                  const n = [...cards];
                  n[i]!.currency = e.target.value as Currency;
                  setCards(n);
                }}
              >
                {CURRENCIES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={c.isCredit || c.type === "credit_card"}
                onChange={(e) => {
                  const n = [...cards];
                  n[i]!.isCredit = e.target.checked;
                  n[i]!.type = e.target.checked ? "credit_card" : "debit_card";
                  setCards(n);
                }}
              />
              Кредитная карта
            </label>
            {c.type === "credit_card" || c.isCredit ? (
              <>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  placeholder="Лимит"
                  inputMode="decimal"
                  value={String(c.creditLimit)}
                  onChange={(e) => {
                    const n = [...cards];
                    n[i]!.creditLimit = Number(e.target.value) || 0;
                    setCards(n);
                  }}
                />
                <input
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  placeholder="Текущий долг"
                  inputMode="decimal"
                  value={String(c.currentDebt)}
                  onChange={(e) => {
                    const n = [...cards];
                    n[i]!.currentDebt = Number(e.target.value) || 0;
                    setCards(n);
                  }}
                />
              </>
            ) : (
              <input
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                placeholder="Баланс"
                inputMode="decimal"
                value={String(c.balance)}
                onChange={(e) => {
                  const n = [...cards];
                  n[i]!.balance = Number(e.target.value) || 0;
                  setCards(n);
                }}
              />
            )}
          </div>
        ))}
        {cards.length < 5 && (
          <Button
            variant="ghost"
            onClick={() =>
              setCards((x) => [
                ...x,
                { name: "Карта", type: "debit_card", currency: "RUB", balance: 0, isCredit: false, creditLimit: 0, currentDebt: 0 },
              ])
            }
          >
            + Карта
          </Button>
        )}
      </Card>

      <Card title="Наличные">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
            inputMode="decimal"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
            value={cashCur}
            onChange={(e) => setCashCur(e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card title="Обязательные платежи (по желанию)">
        {mandatory.map((m, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              placeholder="Название"
              value={m.name}
              onChange={(e) => {
                const n = [...mandatory];
                n[i]!.name = e.target.value;
                setMandatory(n);
              }}
            />
            <input
              className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              placeholder="Сумма"
              value={m.amount}
              onChange={(e) => {
                const n = [...mandatory];
                n[i]!.amount = e.target.value;
                setMandatory(n);
              }}
            />
            <input
              className="w-14 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              placeholder="День"
              value={m.dueDay}
              onChange={(e) => {
                const n = [...mandatory];
                n[i]!.dueDay = e.target.value;
                setMandatory(n);
              }}
            />
            <button
              type="button"
              className="text-rose-400"
              onClick={() => setMandatory(mandatory.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          onClick={() => setMandatory((m) => [...m, { name: "Аренда", amount: "0", dueDay: "1", currency: planCurrency }])}
        >
          + Платёж
        </Button>
      </Card>

      <Card title="Фонды (по желанию)">
        {funds.map((f, i) => (
          <div key={i} className="mb-2 space-y-1 rounded-xl border border-slate-800 p-2">
            <input
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              value={f.name}
              onChange={(e) => {
                const n = [...funds];
                n[i]!.name = e.target.value;
                setFunds(n);
              }}
            />
            <div className="grid grid-cols-3 gap-1 text-sm">
              <input
                className="rounded border border-slate-700 bg-slate-900 px-1"
                placeholder="Цель"
                value={f.target}
                onChange={(e) => {
                  const n = [...funds];
                  n[i]!.target = e.target.value;
                  setFunds(n);
                }}
              />
              <input
                className="rounded border border-slate-700 bg-slate-900 px-1"
                placeholder="Лимит"
                value={f.limit}
                onChange={(e) => {
                  const n = [...funds];
                  n[i]!.limit = e.target.value;
                  setFunds(n);
                }}
              />
              <input
                className="rounded border border-slate-700 bg-slate-900 px-1"
                placeholder="% дохода"
                value={f.pct}
                onChange={(e) => {
                  const n = [...funds];
                  n[i]!.pct = e.target.value;
                  setFunds(n);
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={f.mp}
                onChange={(e) => {
                  const n = [...funds];
                  n[i]!.mp = e.target.checked;
                  if (e.target.checked) n[i]!.type = "marketplace_wallet" as unknown as FundType;
                  setFunds(n);
                }}
              />
              Кошелёк маркетплейса
            </label>
          </div>
        ))}
        <Button
          variant="ghost"
          onClick={() => setFunds((x) => [...x, { name: "Новый фонд", type: "goal", target: "0", limit: "0", pct: "5", mp: false }])}
        >
          + Фонд
        </Button>
      </Card>

      <Card title="Тон рекомендаций">
        <div className="flex gap-2">
          {(["soft", "neutral", "strict"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={`flex-1 rounded-xl border px-2 py-2 text-sm ${
                style === s ? "border-sky-500 text-sky-300" : "border-slate-700 text-slate-400"
              }`}
            >
              {s === "soft" ? "Мягкий" : s === "neutral" ? "Нейтральный" : "Строгий"}
            </button>
          ))}
        </div>
      </Card>

      {err && <p className="text-sm text-rose-300">{err}</p>}
      <Button disabled={loading} onClick={() => void submit()}>
        {loading ? "Сохранение…" : "Начать и построить план месяца"}
      </Button>
    </div>
  );
}
