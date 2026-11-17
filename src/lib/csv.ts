/** CSV seguro: exportación (anti inyección de fórmulas) e importación con límites. */

/**
 * Una celda que empiece con = + - @ TAB o CR puede ejecutarse como fórmula al abrir el CSV en Excel
 * (CSV/formula injection). Se antepone una comilla simple para neutralizarla; los números reales
 * (tipo number) no se tocan porque no pasan por esta ruta.
 */
export function csvCell(v: string | number | boolean | null | undefined): string {
  if (typeof v === "number") return String(v);
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
}

export const CSV_MAX_BYTES = 1_000_000;
export const CSV_MAX_ROWS = 2000;

/** Parser mínimo con comillas; separador `;` o `,` autodetectado. */
export function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      if (rows.length > CSV_MAX_ROWS + 1) throw new Error(`El archivo supera ${CSV_MAX_ROWS} filas.`);
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}
