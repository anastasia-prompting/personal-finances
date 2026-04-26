import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/shared/db/dexie";
import { recalculateAll } from "@/processes/recalculate-finance-state";
import { buildCreditsCsv, buildFundsCsv, buildOperationsCsv, buildPlansCsv, downloadTextFile } from "@/features/export-csv/buildCsvExport";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { toISODate } from "@/shared/lib/date";

export function SettingsPage() {
  const accounts = useLiveQuery(() => db.accounts.toArray());
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Настройки</h1>
      <Card title="Счета">
        {!accounts || accounts.length === 0 ? (
          <p className="text-sm text-slate-500">—</p>
        ) : (
          <ul className="text-sm text-slate-300">
            {accounts.map((a) => (
              <li key={a.id}>
                {a.name} — {a.type} {a.isMain ? "(основной)" : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Пересчёт">
        <p className="text-xs text-slate-500">Пересчитать балансы, периоды и рекомендации из журнала.</p>
        <Button
          className="mt-2"
          onClick={() => {
            void recalculateAll().catch(() => null);
          }}
        >
          Пересчитать план
        </Button>
      </Card>
      <Card title="Экспорт CSV">
        <p className="text-xs text-slate-500">Операции, фонды, кредиты, планы — локально, без облака.</p>
        <Button
          className="mt-2"
          onClick={() => {
            void (async () => {
              const [operations, funds, credits, plans, periods] = await Promise.all([
                db.operations.toArray(),
                db.funds.toArray(),
                db.credits.toArray(),
                db.monthlyPlans.toArray(),
                db.budgetPeriods.toArray(),
              ]);
              const c1 = buildOperationsCsv(operations);
              const c2 = buildFundsCsv(funds);
              const c3 = buildCreditsCsv(credits);
              const c4 = buildPlansCsv(
                plans,
                periods.map((p) => {
                  const planId = p.monthlyPlanId;
                  return { planId, period: p };
                })
              );
              const stamp = toISODate(new Date());
              downloadTextFile(`pf-operations-${stamp}.csv`, c1);
              downloadTextFile(`pf-funds-${stamp}.csv`, c2);
              downloadTextFile(`pf-credits-${stamp}.csv`, c3);
              downloadTextFile(`pf-plans-${stamp}.csv`, c4);
            })();
          }}
        >
          Скачать CSV
        </Button>
      </Card>
    </div>
  );
}
