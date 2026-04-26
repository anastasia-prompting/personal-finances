import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, variant = "primary", className = "", ...p }: Props) {
  const v =
    variant === "primary"
      ? "bg-sky-500 text-slate-900 hover:bg-sky-400"
      : variant === "danger"
        ? "bg-rose-500/20 text-rose-200 border border-rose-500/30"
        : "bg-slate-800 text-slate-200 border border-slate-700";
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${v} ${className}`}
      {...p}
    >
      {children}
    </button>
  );
}
