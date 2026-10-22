const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function money(n: number, decimals = false): string {
  const v = Number.isFinite(n) ? n : 0;
  const s = (decimals ? inr2 : inr).format(Math.abs(v));
  return `${v < 0 ? "-" : ""}₹${s}`;
}

export function pct(n: number): string {
  return `${Math.round(Number.isFinite(n) ? n : 0)}%`;
}
