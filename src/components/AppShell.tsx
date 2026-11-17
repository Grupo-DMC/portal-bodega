"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, Search, X } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { crumbFor, type NavGroup } from "@/lib/nav";
import type { Rol } from "@/lib/domain";
import { ROL_LABEL } from "@/lib/rbac";

export type SearchIndex = {
  prods: { cod: string; desc: string; meta: string }[];
  cots: { id: string; cli: string; estado: string }[];
};

type Props = {
  user: { nombre: string; rol: Rol };
  groups: NavGroup[];
  counts: Partial<Record<"cotizaciones" | "parciales" | "revision" | "critico", number>>;
  index: SearchIndex;
  today: string;
  readOnly: boolean;
  children: React.ReactNode;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function AppShell({ user, groups, counts, index, today, readOnly, children }: Props) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchId = useId();
  const crumb = crumbFor(pathname, groups, user.rol);
  const initials = user.nombre.split(" ").map((w) => w[0]).join("").slice(0, 2);

  // Cerrar paneles al navegar y al hacer clic fuera / Escape.
  useEffect(() => {
    setDrawer(false);
    setMenu(false);
    setSearchOpen(false);
    setQ("");
  }, [pathname]);
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) { setMenu(false); setSearchOpen(false); }
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); setSearchOpen(false); setDrawer(false); } };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, []);

  const nq = norm(q.trim());
  const prods = nq ? index.prods.filter((p) => norm(`${p.cod} ${p.desc}`).includes(nq)).slice(0, 5) : [];
  const cots = nq ? index.cots.filter((c) => norm(`${c.id} ${c.cli}`).includes(nq)).slice(0, 4) : [];
  const showSearch = searchOpen && !!nq;

  const nav = (
    <nav aria-label="Principal" className="flex flex-col pb-6 pt-3">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-5 pb-1.5 pt-[18px] text-[10px] font-semibold uppercase tracking-[0.18em] text-n500">{g.label}</div>
          {g.items.map((it) => {
            const active = it.href === "/" ? pathname === "/" : pathname === it.href || pathname.startsWith(`${it.href}/`);
            const activeKey = pathname.startsWith("/productos/") && it.href === "/productos";
            const on = active || activeKey;
            const n = it.key ? counts[it.key] : 0;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-10 items-center justify-between gap-2 border-l-[3px] py-2 pl-[17px] pr-5 text-sm no-underline transition-colors duration-150 hover:bg-white/10 hover:!text-white ${
                  on ? "border-accent bg-white/10 font-semibold !text-white" : "border-transparent !text-n300"
                }`}
              >
                <span>{it.label}</span>
                {n ? (
                  <span className={`min-w-[22px] px-1.5 text-center text-[11px] font-semibold tabular-nums !text-white ${it.key === "critico" ? "bg-a600" : "bg-n700"}`}>{n}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3 border-b-[3px] border-accent bg-white px-5 py-4">
      <div className="flex flex-col leading-none">
        <span className="text-[28px] font-extrabold tracking-[-0.05em] text-brand">dMC</span>
        <span className="mt-0.5 text-[7px] uppercase tracking-[0.1em] text-brand">Grupo DMC</span>
      </div>
      <div className="flex flex-col leading-[1.1]">
        <span className="text-[17px] font-extrabold tracking-[-0.02em]">Bodega</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">v1.0</span>
      </div>
    </div>
  );

  const foot = (
    <div className="mt-auto border-t border-white/10 px-5 py-4 text-[11px] tracking-[0.04em] text-n500">
      Comercializadora DMC S.P.A.<br />Hoy · {today}
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar fija en escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col overflow-y-auto bg-ink text-white lg:flex">
        {brand}
        {nav}
        {foot}
      </aside>

      {/* Cajón en móvil / tablet */}
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="fade absolute inset-0 bg-n900/60" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="slide-in absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-ink text-white" aria-label="Menú">
            <div className="flex items-stretch">
              <div className="flex-1">{brand}</div>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Cerrar menú" className="grid w-12 place-items-center border-b-[3px] border-accent bg-white text-ink">
                <X size={20} aria-hidden />
              </button>
            </div>
            {nav}
            {foot}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header ref={headerRef} className="sticky top-0 z-30 flex h-16 flex-none items-center gap-3 border-b border-n300 bg-white px-3 sm:gap-6 sm:px-8">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Abrir menú" className="grid h-10 w-10 flex-none place-items-center lg:hidden">
            <Menu size={22} aria-hidden />
          </button>
          <div className="hidden min-w-[220px] items-center gap-2 text-[11px] uppercase tracking-[0.14em] xl:flex">
            <span className="text-muted">{crumb.group}</span>
            <span className="text-n400" aria-hidden>/</span>
            <span className="font-semibold">{crumb.page}</span>
          </div>
          <div className="relative min-w-0 max-w-[520px] flex-1" role="search">
            <Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted" aria-hidden />
            <label htmlFor={searchId} className="sr-only">Buscar producto o N° de cotización</label>
            <input
              id={searchId}
              className="input !bg-bg !pl-9"
              type="search"
              autoComplete="off"
              maxLength={60}
              placeholder="Buscar producto o N° de cotización…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
            />
            {showSearch && (
              <div className="absolute inset-x-0 top-[46px] z-30 border border-n300 bg-white shadow-md">
                {prods.length > 0 && <div className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.16em] text-muted">Productos</div>}
                {prods.map((r) => (
                  <Link key={r.cod} href={`/productos/${encodeURIComponent(r.cod)}`} className="flex min-h-10 items-center gap-3 px-3 py-2 text-[13px] !text-ink no-underline hover:bg-n100">
                    <b className="min-w-[84px]">{r.cod}</b>
                    <span className="min-w-0 truncate">{r.desc}</span>
                    <span className="ml-auto flex-none text-muted">{r.meta}</span>
                  </Link>
                ))}
                {cots.length > 0 && <div className="border-t border-n200 px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.16em] text-muted">Cotizaciones</div>}
                {cots.map((r) => (
                  <Link key={r.id} href={`/despachar/${r.id}`} className="flex min-h-10 items-center gap-3 px-3 py-2 text-[13px] !text-ink no-underline hover:bg-n100">
                    <b className="min-w-[84px]">{r.id}</b>
                    <span className="min-w-0 truncate">{r.cli}</span>
                    <span className="ml-auto flex-none text-muted">{r.estado}</span>
                  </Link>
                ))}
                {!prods.length && !cots.length && <div className="px-3 py-3.5 text-[13px] text-muted">Sin resultados para “{q}”.</div>}
              </div>
            )}
          </div>

          <div className="relative ml-auto">
            <button type="button" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((m) => !m)} className="flex min-h-10 cursor-pointer items-center gap-3 border-0 bg-transparent py-1.5">
              <span className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-sm font-semibold">{user.nombre}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">{user.rol}</span>
              </span>
              <span className="grid h-9 w-9 place-items-center bg-ink text-[13px] font-extrabold text-white" aria-hidden>{initials}</span>
              <ChevronDown size={14} aria-hidden />
              <span className="sr-only">Menú de usuario: {user.nombre}</span>
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 top-[52px] z-30 w-[260px] border border-n300 bg-white shadow-md">
                <div className="border-b border-n200 px-3.5 py-3">
                  <div className="text-sm font-semibold">{user.nombre}</div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted">{ROL_LABEL[user.rol]}</div>
                </div>
                <form action={logoutAction}>
                  <button type="submit" role="menuitem" className="flex min-h-11 w-full cursor-pointer items-center gap-2 border-0 bg-white px-3.5 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-a700 hover:bg-n100">
                    <LogOut size={14} aria-hidden /> Cerrar sesión
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        {readOnly && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-n900 px-4 py-2 text-xs tracking-[0.04em] text-white sm:px-8">
            <span className="font-bold uppercase tracking-[0.14em]">Solo lectura</span>
            <span className="text-n300">Perfil Ventas: puede consultar stock, reservas y despachos, sin ejecutar acciones.</span>
          </div>
        )}
        <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-8 sm:pt-8">{children}</main>
      </div>
    </div>
  );
}
