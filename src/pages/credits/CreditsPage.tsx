import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/shared/db/dexie";
import { Card } from "@/shared/ui/Card";
import { formatMoney } from "@/shared/lib/currency";
import { getMonthRange, isDateInRange } from "@/shared/lib/date";
import { estimatePayoffMonths } from "@/shared/lib/finance-engine/estimate";
import { getOperationTypeLabel } from "@/entities/operation/api/operationsService";

export function CreditsPage() {
  const credits = useLiveQuery(() => db.credits.toArray(), []);
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const { start, end } = getMonthRange(y, m);
  const all = useLiveQuery(() => db.operations.toArray(), []);
  const rel = useMemo(
    () =>
      (all ?? []).filter(
        (o) =>
          (o.type === "credit_payment" || o.type === "debt_increase") && isDateInRange(o.date, start, end)
      ),
    [all, start, end]
  );

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Кредиты и долги</h1>
      {(!credits || credits.length === 0) && <p className="text-sm text-slate-500">Нет записей</p>}
      {credits?.map((c) => {
        const months = estimatePayoffMonths(c.currentDebt, c.comfortablePayment);
        return (
          <Card key={c.id} title={c.name}>
            <p className="text-sm">Текущий долг: {formatMoney(c.currentDebt, c.currency)}</p>
            {c.comfortablePayment > 0 && months != null && (
              <p className="text-xs text-slate-500">Ориентир срока при комф. платеже: ≈{months} мес.</p>
            )}
          </Card>
        );
      })}
      <Card title="Движения за месяц">
        {rel.length === 0 ? (
          <p className="text-xs text-slate-500">Нет движений</p>
        ) : (
          <ul className="text-sm">
            {rel.map((o) => (
              <li key={o.id} className="flex justify-between">
                <span>
                  {getOperationTypeLabel(o.type)} {o.date}
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
