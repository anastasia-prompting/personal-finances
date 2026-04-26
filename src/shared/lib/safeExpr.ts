/**
 * Мини-калькулятор: цифры, точка, скобки и операции + − × ÷ (как + - * /). Локальное PWA.
 */
export function safeEvalNumber(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (!/^[-+*/().\d\s]+$/u.test(t)) return null;
  let r: number;
  try {
    r = new Function(`"use strict"; return ( ${t} )`)() as number;
  } catch {
    return null;
  }
  if (typeof r !== "number" || !Number.isFinite(r)) return null;
  return Math.round(r * 100) / 100;
}
