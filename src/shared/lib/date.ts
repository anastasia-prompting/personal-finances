export function parseISODate(s: string): Date {
  const d = new Date(s + "T12:00:00");
  return d;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function ymdFromISODate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map((x) => Number.parseInt(x, 10));
  return { y, m, d };
}

export function isDateInRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return { start: toISODate(first), end: toISODate(last) };
}
