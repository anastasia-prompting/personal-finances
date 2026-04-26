import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/shared/db/dexie";
import { Card } from "@/shared/ui/Card";
import { formatMoney } from "@/shared/lib/currency";

export function FundsPage() {
  const funds = useLiveQuery(() => db.funds.toArray(), []);
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Фонды</h1>
      {!funds || funds.length === 0 ? (
        <p className="text-sm text-slate-500">Нет фондов. Добавь в настройках позже.</p>
      ) : (
        <div className="space-y-2">
          {funds.map((f) => (
            <Card key={f.id} title={f.name}>
              <p className="text-sm">Баланс: {formatMoney(f.currentBalance, "RUB")}</p>
              {f.targetAmount > 0 && (
                <p className="text-xs text-slate-500">Цель: {formatMoney(f.targetAmount, "RUB")}</p>
              )}
              {f.plannedIncomePercent > 0 && <p className="text-xs text-slate-500">От дохода: {f.plannedIncomePercent}%</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
