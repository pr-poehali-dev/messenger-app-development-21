export function formatDateLabel(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffDays = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return d.toLocaleDateString("ru", { weekday: "long" });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString("ru", { day: "numeric", month: "long" });
  return d.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

export function dayKey(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
