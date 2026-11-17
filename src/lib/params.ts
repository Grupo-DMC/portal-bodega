export type SP = Record<string, string | string[] | undefined>;

/** Lee un parámetro de URL como texto acotado (los filtros son entrada de usuario). */
export function pick(sp: SP, key: string, max = 80): string {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s.trim().slice(0, max) : "";
}

export function oneOf<T extends string>(v: string, allowed: readonly T[]): T | "" {
  return (allowed as readonly string[]).includes(v) ? (v as T) : "";
}
