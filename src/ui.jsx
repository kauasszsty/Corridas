import { Inbox, Search } from "lucide-react";

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function normalizar(texto = "") {
  return texto.toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const TONES = {
  neutral: "border-white/10 bg-white/[0.05] text-slate-300",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function Pill({ tone = "neutral", className, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px]",
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={cx("flex flex-wrap items-center gap-1 border-b border-v2line", className)}>
      {tabs.map((tab) => {
        const ativo = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cx(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] transition",
              ativo ? "border-v2accent text-v2ink" : "border-transparent text-v2muted hover:text-v2ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cx(
                  "tabular ml-0.5 rounded px-1.5 py-0.5 text-[10px]",
                  ativo ? "bg-v2accent/15 text-v2accent" : "bg-white/[0.05] text-v2faint",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({ className, ...props }) {
  return (
    <div className={cx("relative", className)}>
      <Search
        size={14}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-v2faint"
      />
      <input
        type="search"
        className="w-full rounded-lg border border-v2line bg-v2elevated py-2 pl-9 pr-3 text-[13px] text-v2ink placeholder:text-v2faint focus:border-v2accent/50 focus:outline-none"
        {...props}
      />
    </div>
  );
}

export function Panel({ className, children }) {
  return <section className={cx("rounded-xl border border-v2line bg-v2card", className)}>{children}</section>;
}

export function EmptyState({ icon: Icon = Inbox, title }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <Icon size={26} strokeWidth={1.5} className="mb-3 text-v2faint" />
      <p className="text-sm text-v2muted">{title}</p>
    </div>
  );
}
