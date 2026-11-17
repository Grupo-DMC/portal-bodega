"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

export type FilterField = {
  name: string;
  label: string;
  type: "text" | "select";
  placeholder?: string;
  options?: { v: string; l: string }[];
  allLabel?: string;
  /** Clases de ancho (grid). */
  span?: string;
  maxLength?: number;
};

/**
 * Filtros guiados por la URL: cada cambio actualiza los parámetros y el servidor vuelve a consultar.
 * Así el resultado es compartible/recargable y el mismo filtro sirve para la exportación CSV.
 */
export function FilterBar({ fields, className = "", reset = true }: { fields: FilterField[]; className?: string; reset?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [texts, setTexts] = useState<Record<string, string>>(() => Object.fromEntries(fields.filter((f) => f.type === "text").map((f) => [f.name, sp.get(f.name) ?? ""])));

  // Si la URL cambia desde fuera (p. ej. "Limpiar filtros"), sincroniza los campos de texto.
  useEffect(() => {
    setTexts((prev) =>
      Object.fromEntries(
        fields.filter((f) => f.type === "text").map((f) => {
          const url = sp.get(f.name) ?? "";
          return [f.name, url === (prev[f.name] ?? "").trim() ? (prev[f.name] ?? "") : url]; // no pisar espacios que el usuario aún está escribiendo
        }),
      ),
    );
  }, [sp, fields]);

  function push(name: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(name, value);
    else p.delete(name);
    if (name === "fam") p.delete("sub"); // la subfamilia depende de la familia
    start(() => router.replace(p.size ? `${path}?${p}` : path, { scroll: false }));
  }

  const has = fields.some((f) => sp.get(f.name));

  return (
    <div className={`grid items-end gap-3 ${className}`} aria-busy={pending}>
      {fields.map((f) => {
        const id = `f-${f.name}`;
        return (
          <div key={f.name} className={`field ${f.span ?? ""}`}>
            <label className="label" htmlFor={id}>{f.label}</label>
            {f.type === "select" ? (
              <select id={id} className="input" value={sp.get(f.name) ?? ""} onChange={(e) => push(f.name, e.target.value)}>
                <option value="">{f.allLabel ?? "Todos"}</option>
                {f.options?.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ) : (
              <input
                id={id}
                className="input"
                type="search"
                autoComplete="off"
                maxLength={f.maxLength ?? 80}
                placeholder={f.placeholder}
                value={texts[f.name] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setTexts((t) => ({ ...t, [f.name]: v }));
                  if (timer.current) clearTimeout(timer.current);
                  timer.current = setTimeout(() => push(f.name, v.trim()), 250);
                }}
              />
            )}
          </div>
        );
      })}
      {reset && has && (
        <button type="button" className="btn btn-ghost" onClick={() => start(() => router.replace(path, { scroll: false }))}>
          <X size={14} aria-hidden /> Limpiar filtros
        </button>
      )}
    </div>
  );
}
