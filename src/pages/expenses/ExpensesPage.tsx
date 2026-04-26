import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/shared/db/dexie";
import { Card } from "@/shared/ui/Card";
import { formatMoney } from "@/shared/lib/currency";
import { getMonthRange, isDateInRange } from "@/shared/lib/date";

export function ExpensesPage() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const { start, end } = getMonthRange(y, m);
  const plan = useLiveQuery(
    () => db.monthlyPlans.toArray().then((rows) => rows.find((p) => p.year === y && p.month === m)),
    [y, m]
  );
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const ops = useLiveQuery(() => db.operations.where("type").equals("expense").toArray(), []);
  const byMonth = useMemo(
    () => (ops ? ops.filter((o) => isDateInRange(o.date, start, end) && (plan == null || o.currency === plan.currency)) : []),
    [ops, start, end, plan]
  );
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    const catName = (id: string | null) => categories?.find((c) => c.id === id)?.name ?? "—";
    for (const o of byMonth) {
      const k = catName(o.categoryId);
      m.set(k, (m.get(k) ?? 0) + o.amount);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [byMonth, categories]);
  const total = byMonth.reduce((s, o) => s + o.amount, 0);
  const cur = plan?.currency ?? "RUB";

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Расходы месяца</h1>
      <Card title="План-факт">
        <p className="text-sm">
          Потрачено: {formatMoney(Math.round(total * 100) / 100, cur)}
        </p>
        {plan && <p className="text-xs text-slate-500">Операционный ориентир месяца: {formatMoney(plan.operationalLimit, plan.currency)} (без жёсткого запрета)</p>}
      </Card>
      <Card title="По категориям (без сложных графиков)">
        {byCat.length === 0 ? (
          <p className="text-sm text-slate-500">Пока нет расходов</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {byCat.map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="font-mono">{formatMoney(v, cur)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
