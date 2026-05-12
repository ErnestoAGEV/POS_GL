export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function formatTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(date);
}
