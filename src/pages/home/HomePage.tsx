import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/shared/db/dexie";
import { Card } from "@/shared/ui/Card";
import { formatMoney } from "@/shared/lib/currency";
import { toISODate } from "@/shared/lib/date";
import { getOperationTypeLabel } from "@/entities/operation/api/operationsService";

export function HomePage() {
  const today = toISODate(new Date());
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const plan = useLiveQuery(
    () => db.monthlyPlans.toArray().then((rows) => rows.find((p) => p.year === y && p.month === m)),
    [y, m]
  );
  const periods = useLiveQuery(async () => {
    if (!plan) return [];
    return db.budgetPeriods.where("monthlyPlanId").equals(plan.id).toArray();
  }, [plan?.id]);
  const current = periods?.find((p) => p.startDate <= today && p.endDate >= today);
  const mainAcc = useLiveQuery(() => db.accounts.filter((a) => a.isMain).first());
  const cashAcc = useLiveQuery(
    () => db.accounts.filter((a) => a.type === "cash").first(),
    []
  );
  const recent = useLiveQuery(
    () => db.operations.orderBy("date").reverse().limit(5).toArray(),
    []
  );
  const funds = useLiveQuery(() => db.funds.toArray(), []);
  const credits = useLiveQuery(() => db.credits.toArray(), []);
  const recs = useLiveQuery(() => db.recommendations.limit(3).toArray(), []);

  const fundTotal = funds?.reduce((s, f) => s + f.currentBalance, 0) ?? 0;
  const debtTotal = credits?.reduce((s, c) => s + c.currentDebt, 0) ?? 0;
  const cur = plan?.currency ?? "RUB";

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-semibold">Сейчас</h1>
        <p className="text-sm text-slate-400">Ясность без давления</p>
      </header>

      {current && plan && (
        <Card title={`Период ${current.index + 1} / 4`}>
          <div className="flex items-center justify-between text-sm">
            <span>Остаток периода</span>
            <span className="font-mono text-slate-200">{formatMoney(current.remainingAmount, plan.currency)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm text-slate-500">
            <span>Ориентир / день</span>
            <span className="font-mono">{formatMoney(current.dailyTarget, plan.currency)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Сейчас ≈ / день</span>
            <span className="font-mono">{formatMoney(current.dailyRemainingTarget, plan.currency)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Статус: {current.status === "ok" ? "в норме" : current.status === "attention" ? "внимание" : "риск перерасхода"}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/income" className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-sky-300">
          Доходы месяца
        </Link>
        <Link to="/expenses" className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-sky-300">
          Расходы месяца
        </Link>
      </div>

      <Card title="Счета">
        {mainAcc && (
          <p className="text-sm">
            Основной: {mainAcc.name} — {formatMoney(mainAcc.balance, mainAcc.currency)}
          </p>
        )}
        {cashAcc && (
          <p className="text-sm text-slate-400">
            Наличные: {formatMoney(cashAcc.balance, cashAcc.currency)}
          </p>
        )}
        {!mainAcc && !cashAcc && <p className="text-sm text-slate-500">Нет счетов</p>}
      </Card>

      <Card title="Сводка">
        <p className="text-sm">Фонды (всего, разные валюты не суммируем): {fundTotal ? `${fundTotal.toFixed(0)}` : "0"}</p>
        <p className="text-sm text-slate-400">Долг: {debtTotal ? formatMoney(debtTotal, cur) : "—"}</p>
      </Card>

      {recs && recs.length > 0 && (
        <Card title="Рекомендации">
          <ul className="space-y-2 text-sm text-slate-300">
            {recs.map((r) => (
              <li key={r.id} className="leading-snug">
                {r.text}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Последние операции">
        {!recent || recent.length === 0 ? (
          <p className="text-sm text-slate-500">Пока пусто</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((o) => (
              <li key={o.id} className="flex justify-between gap-2 text-slate-300">
                <span>
                  {o.date} · {getOperationTypeLabel(o.type)}
                </span>
                <span className="font-mono text-slate-200">{formatMoney(o.amount, o.currency)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/journal" className="mt-2 block text-sm text-sky-400">
          Весь журнал
        </Link>
      </Card>
    </div>
  );
}
