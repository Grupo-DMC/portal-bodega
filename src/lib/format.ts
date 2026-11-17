/** Formato y fechas. Las fechas se guardan como ISO "YYYY-MM-DD" y se muestran dd/mm/yyyy. */

const TZ = "America/Santiago";

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function nowHM(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-CL", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
}

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Días desde hoy hasta la fecha (negativo = pasado). */
export function daysFromToday(iso: string): number {
  return Math.round((toUTC(iso) - toUTC(todayISO())) / 86_400_000);
}

export function addDays(iso: string, n: number): string {
  return new Date(toUTC(iso) + n * 86_400_000).toISOString().slice(0, 10);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** dd/mm/yyyy → ISO. Devuelve null si es inválida. */
export function parseDMY(s: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export function weekdayName(iso: string): string {
  return DIAS[new Date(toUTC(iso)).getUTCDay()];
}

export function fmt(n: number | null | undefined | ""): string {
  if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CL");
}

/** Número con signo explícito (+ / −). */
export function fmtS(n: number): string {
  return (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));
}
