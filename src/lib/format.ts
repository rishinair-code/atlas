export function formatMoney(n: number, currency = "$"): string {
  const rounded = Math.round(n);
  return `${currency}${rounded.toLocaleString("en-US")}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatMonth(m: number): string {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[(m - 1 + 12) % 12] ?? "";
}
