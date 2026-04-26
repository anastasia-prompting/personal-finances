import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { db } from "@/shared/db/dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { OnboardingPage } from "@/pages/onboarding/OnboardingPage";
import { HomePage } from "@/pages/home/HomePage";
import { JournalPage } from "@/pages/journal/JournalPage";
import { OperationEntryPage } from "@/pages/operation-entry/OperationEntryPage";
import { IncomePage } from "@/pages/income/IncomePage";
import { ExpensesPage } from "@/pages/expenses/ExpensesPage";
import { FundsPage } from "@/pages/funds/FundsPage";
import { CreditsPage } from "@/pages/credits/CreditsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { AppShell } from "@/shared/ui/AppShell";

function OnboardingGuard({ children }: { children: ReactNode }) {
  const done = useLiveQuery(() => db.appMeta.get("onboardingComplete"), [], undefined);
  if (done === undefined) return <div className="p-4 text-slate-400">…</div>;
  if (done?.value === "1") return <>{children}</>;
  return <Navigate to="/onboarding" replace />;
}

function OnboardingOpenOnly({ children }: { children: ReactNode }) {
  const done = useLiveQuery(() => db.appMeta.get("onboardingComplete"), [], undefined);
  if (done === undefined) return <div className="p-4 text-slate-400">…</div>;
  if (done?.value === "1") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          <OnboardingOpenOnly>
            <OnboardingPage />
          </OnboardingOpenOnly>
        }
      />
      <Route
        path="/"
        element={
          <OnboardingGuard>
            <AppShell />
          </OnboardingGuard>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="funds" element={<FundsPage />} />
        <Route path="credits" element={<CreditsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="operation" element={<OperationEntryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
