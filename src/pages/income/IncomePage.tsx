import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/shared/db/dexie";
import { Card } from "@/shared/ui/Card";
import { formatMoney } from "@/shared/lib/currency";
import { getMonthRange, isDateInRange } from "@/shared/lib/date";

export function IncomePage() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const { start, end } = getMonthRange(y, m);
  const plan = useLiveQuery(
    () => db.monthlyPlans.toArray().then((rows) => rows.find((p) => p.year === y && p.month === m)),
    [y, m]
  );
  const ops = useLiveQuery(() => db.operations.where("type").equals("income").toArray(), []);
  const byMonth = useMemo(
    () => (ops ? ops.filter((o) => isDateInRange(o.date, start, end)) : []),
    [ops, start, end]
  );
  const total = byMonth.filter((o) => plan == null || o.currency === plan.currency).reduce((s, o) => s + o.amount, 0);
  const cur = plan?.currency ?? "RUB";

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Доходы месяца</h1>
      <Card title="Сводка">
        <p className="text-sm">В {plan ? `${m}.${y}` : "—"}: {formatMoney(Math.round(total * 100) / 100, cur)}</p>
        <p className="mt-1 text-xs text-slate-500">Проценты, кэшбэк — по категориям в списке.</p>
      </Card>
      <Card title="Список">
        {byMonth.length === 0 ? (
          <p className="text-sm text-slate-500">Пока нет доходов</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {byMonth.map((o) => (
              <li key={o.id} className="flex justify-between">
                <span>
                  {o.date}
                  {o.comment ? ` · ${o.comment}` : ""}
                </span>
                <span className="font-mono">{formatMoney(o.amount, o.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
