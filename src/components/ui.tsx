import Link from "next/link";
import { CircleAlert, CircleCheck, TriangleAlert, Info } from "lucide-react";
import { BADGE_TONE, SEM_META, type Sem, type Tone } from "@/lib/domain";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function PageHead({
  kicker, title, actions, children,
}: { kicker: string; title: string; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className={cx("rule", !children && "pb-5")}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="kicker mb-2">{kicker}</div>
          <h1 className="page-title">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function Panel({
  title, right, children, className, bodyClass,
}: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cx("panel", className)}>
      {title && (
        <div className="panel-h">
          <h2 className="!text-[11px] !font-semibold !tracking-[0.14em] uppercase">{title}</h2>
          {right}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Badge({ label, tone = "neutral", className }: { label: React.ReactNode; tone?: Tone; className?: string }) {
  return <span className={cx("badge", `tone-${tone}`, className)}>{label}</span>;
}

export function StatusBadge({ estado, label }: { estado: string; label?: string }) {
  return <Badge label={label ?? estado} tone={BADGE_TONE[estado] ?? "neutral"} />;
}

const SEM_ICON = { rojo: CircleAlert, amarillo: TriangleAlert, verde: CircleCheck } as const;

/** Semáforo con ícono + texto (nunca solo color). */
export function SemBadge({ sem, size = 12 }: { sem: Sem; size?: number }) {
  const Icon = SEM_ICON[sem];
  return (
    <span className={cx("badge", `sem-${sem}`)}>
      <Icon size={size} strokeWidth={2.2} aria-hidden />
      {SEM_META[sem].label}
    </span>
  );
}

export function Field({
  label, children, error, hint, className, htmlFor,
}: { label: React.ReactNode; children: React.ReactNode; error?: string; hint?: string; className?: string; htmlFor?: string }) {
  return (
    <div className={cx("field", className)}>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className="field-err" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

const NOTICE_ICON = { ok: CircleCheck, warn: TriangleAlert, info: Info, err: CircleAlert } as const;
export function Notice({ tone = "info", children, className }: { tone?: "ok" | "warn" | "info" | "err"; children: React.ReactNode; className?: string }) {
  const Icon = NOTICE_ICON[tone];
  return (
    <div className={cx("notice", `notice-${tone}`, className)} role={tone === "err" ? "alert" : "status"}>
      <Icon size={20} strokeWidth={2} className="mt-px flex-none" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Progress({ pct, tone = "accent", h = 6 }: { pct: number; tone?: "accent" | "ok"; h?: number }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="bg-n200" style={{ height: h }} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={tone === "ok" ? "bg-ok-dot" : "bg-accent"} style={{ height: "100%", width: `${v}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-sm text-muted">{children}</div>;
}

export function TabLinks({ tabs, current, base }: { tabs: { key: string; label: string }[]; current: string; base: string }) {
  return (
    <nav className="mt-5 -mb-[2px] flex gap-6 overflow-x-auto" aria-label="Secciones">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`${base}?tab=${t.key}`}
          aria-current={t.key === current ? "page" : undefined}
          className={cx(
            "whitespace-nowrap border-b-[3px] py-3 text-[13px] font-extrabold uppercase tracking-[0.1em] no-underline",
            t.key === current ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Color de saldo/diferencia en tablas. */
export const numTone = (n: number) => (n > 0 ? "text-ok-fg" : n < 0 ? "text-a700" : "");
