import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/shared/db/dexie";
import { deleteOperation, getOperationTypeLabel } from "@/entities/operation/api/operationsService";
import { Card } from "@/shared/ui/Card";
import { formatMoney } from "@/shared/lib/currency";
import { getMonthRange, toISODate } from "@/shared/lib/date";
import { OPERATION_TYPES, type OperationType } from "@/entities/operation/model/types";

export function JournalPage() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const { start, end } = getMonthRange(y, m);
  const [typeFilter, setTypeFilter] = useState<OperationType | "all">("all");
  const all = useLiveQuery(
    () =>
      db.operations
        .where("date")
        .between(start, end, true, true)
        .toArray()
        .then((rows) => rows.sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date < b.date ? 1 : -1))),
    [y, m, start, end]
  );
  const filtered = useMemo(() => {
    if (!all) return [];
    if (typeFilter === "all") return all;
    return all.filter((o) => o.type === typeFilter);
  }, [all, typeFilter]);

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Журнал</h1>
      <p className="text-xs text-slate-500">
        {toISODate(new Date())} · месяц {m}.{y}
      </p>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={`rounded-full px-2 py-0.5 text-xs ${typeFilter === "all" ? "bg-sky-500/20 text-sky-300" : "bg-slate-800"}`}
          onClick={() => setTypeFilter("all")}
        >
          Все
        </button>
        {OPERATION_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-full px-2 py-0.5 text-xs ${typeFilter === t ? "bg-sky-500/20 text-sky-300" : "bg-slate-800"}`}
            onClick={() => setTypeFilter(t)}
          >
            {getOperationTypeLabel(t)}
          </button>
        ))}
      </div>
      <Card>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">Нет операций</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((o) => (
              <li key={o.id} className="flex flex-col gap-1 border-b border-slate-800 pb-2 text-sm last:border-0">
                <div className="flex justify-between">
                  <span>
                    {o.date} · {getOperationTypeLabel(o.type)}
                  </span>
                  <span className="font-mono">{formatMoney(o.amount, o.currency)}</span>
                </div>
                {o.comment && <p className="text-xs text-slate-500">{o.comment}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-rose-300"
                    onClick={() => void deleteOperation(o.id).catch(() => null)}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-slate-500">Редактирование: в следующем шаге через отдельный экран. Сейчас: удаление и повторный ввод.</p>
    </div>
  );
}
