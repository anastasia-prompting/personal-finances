import { useEffect, useState } from "react";
import { initApp } from "@/shared/db/initApp";
import { AppRouter } from "./router";

export function App() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    void initApp()
      .then(() => setReady(true))
      .catch((e) => setErr(e instanceof Error ? e.message : "Ошибка инициализации"));
  }, []);
  if (err) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-sm text-rose-300">
        {err}
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-slate-400">Загрузка…</div>
    );
  }
  return <AppRouter />;
}
