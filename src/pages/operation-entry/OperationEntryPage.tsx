import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/shared/db/dexie";
import { addOperation, getOperationTypeLabel } from "@/entities/operation/api/operationsService";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { parseAmount } from "@/shared/lib/validators";
import { toISODate } from "@/shared/lib/date";
import type { OperationType } from "@/entities/operation/model/types";
import { safeEvalNumber } from "@/shared/lib/safeExpr";
import type { Currency } from "@/shared/lib/money";
import { CURRENCIES } from "@/shared/lib/money";

const steps = [1, 2, 3, 4] as const;

export function OperationEntryPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<(typeof steps)[number]>(1);
  const [type, setType] = useState<OperationType | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [showCalc, setShowCalc] = useState(false);
  const [calcExpr, setCalcExpr] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [fundId, setFundId] = useState<string | null>(null);
  const [creditId, setCreditId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("RUB");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const accounts = useLiveQuery(() => db.accounts.toArray(), []);
  const categories = useLiveQuery(
    () => db.categories.toArray(),
    []
  );
  const funds = useLiveQuery(() => db.funds.toArray(), []);
  const credits = useLiveQuery(() => db.credits.toArray(), []);

  const incomeCats = useMemo(
    () => (categories ? categories.filter((c) => c.type === "income") : []),
    [categories]
  );
  const expenseCats = useMemo(
    () => (categories ? categories.filter((c) => c.type === "expense") : []),
    [categories]
  );

  const date = toISODate(new Date());

  async function save() {
    if (!type) {
      setMsg("Выберите тип");
      return;
    }
    const pa = parseAmount(amountStr);
    if (!pa.ok) {
      setMsg(pa.error);
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await addOperation({
        date,
        type,
        amount: pa.value,
        currency,
        accountId,
        categoryId,
        fundId,
        creditId,
        comment: comment.trim(),
      });
      void nav("/", { replace: true });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 pb-8">
      <h1 className="text-lg font-semibold">Новая операция</h1>
      <p className="text-xs text-slate-500">Шаг {step} / 4</p>

      {step === 1 && (
        <Card title="Тип">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                "expense",
                "income",
                "transfer_to_fund",
                "expense_from_fund",
                "credit_payment",
                "debt_increase",
              ] as const
            ).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setStep(2);
                }}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 px-2 py-3 text-left text-sm text-slate-200"
              >
                {getOperationTypeLabel(t)}
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Сумма">
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-lg font-mono"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
          />
          <button type="button" className="mt-2 text-sm text-sky-400" onClick={() => setShowCalc(true)}>
            Калькулятор
          </button>
          <div className="mt-2">
            <label className="text-xs text-slate-500">Валюта</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Назад
            </Button>
            <Button
              onClick={() => {
                const p = parseAmount(amountStr);
                if (!p.ok) {
                  setMsg(p.error);
                  return;
                }
                if (!type) return;
                setMsg(null);
                setStep(3);
              }}
            >
              Далее
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && type && (
        <Card title="Детали">
          {type === "income" || type === "expense" ? (
            <>
              <label className="text-xs text-slate-500">Счёт</label>
              <select
                className="mb-2 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2"
                value={accountId ?? ""}
                onChange={(e) => setAccountId(e.target.value || null)}
              >
                <option value="">—</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
              <label className="text-xs text-slate-500">Категория</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2"
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value || null)}
              >
                <option value="">—</option>
                {(type === "income" ? incomeCats : expenseCats).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          {type === "transfer_to_fund" && (
            <>
              <label className="text-xs text-slate-500">Счёт</label>
              <select
                className="mb-2 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2"
                value={accountId ?? ""}
                onChange={(e) => setAccountId(e.target.value || null)}
              >
                <option value="">—</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <label className="text-xs text-slate-500">Фонд</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2"
                value={fundId ?? ""}
                onChange={(e) => setFundId(e.target.value || null)}
              >
                <option value="">—</option>
                {funds?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {type === "expense_from_fund" && (
            <>
              <label className="text-xs text-slate-500">Фонд</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2"
                value={fundId ?? ""}
                onChange={(e) => setFundId(e.target.value || null)}
              >
                <option value="">—</option>
                {funds?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {(type === "credit_payment" || type === "debt_increase") && (
            <label className="text-xs text-slate-500">Кредит / долг</label>
          )}
          {type === "credit_payment" && (
            <>
              <select
                className="mb-2 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2"
                value={accountId ?? ""}
                onChange={(e) => setAccountId(e.target.value || null)}
              >
                <option value="">Счёт списания</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2"
                value={creditId ?? ""}
                onChange={(e) => setCreditId(e.target.value || null)}
              >
                <option value="">—</option>
                {credits?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {type === "debt_increase" && (
            <select
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2 py-2"
              value={creditId ?? ""}
              onChange={(e) => setCreditId(e.target.value || null)}
            >
              <option value="">—</option>
              {credits?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Назад
            </Button>
            <Button
              onClick={() => {
                setMsg(null);
                setStep(4);
              }}
            >
              Далее
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card title="Комментарий (по желанию)">
          <textarea
            className="min-h-20 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Заметка для себя"
          />
          {msg && <p className="text-sm text-rose-300">{msg}</p>}
          <div className="mt-2 flex flex-col gap-2">
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(3)}>
              Назад
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAmountStr("");
                setStep(1);
                setType(null);
                setComment("");
                setAccountId(null);
                setCategoryId(null);
                setFundId(null);
                setCreditId(null);
              }}
            >
              Добавить ещё
            </Button>
            <Button variant="ghost" onClick={() => void nav("/")}>
              На главный
            </Button>
          </div>
        </Card>
      )}

      {showCalc && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-3">
            <p className="text-sm text-slate-400">Выражение</p>
            <input
              className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 font-mono"
              value={calcExpr}
              onChange={(e) => setCalcExpr(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const n = safeEvalNumber(calcExpr);
                  if (n == null) {
                    setMsg("Некорректное выражение");
                    return;
                  }
                  setAmountStr(String(n));
                  setShowCalc(false);
                }}
              >
                Вставить
              </Button>
              <Button variant="ghost" onClick={() => setShowCalc(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
