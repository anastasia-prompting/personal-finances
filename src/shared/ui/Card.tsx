import type { ReactNode } from "react";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      {title && <h2 className="mb-2 text-sm font-medium text-slate-300">{title}</h2>}
      {children}
    </section>
  );
}
