import { ArrowUpRight, LucideIcon } from "lucide-react";

type Props = {
  title: string;
  eyebrow?: string;
  description?: string;
  icon?: LucideIcon;
  tone?: string;
  onClick?: () => void;
};

export function DashboardCard({
  title,
  eyebrow = "Workspace",
  description = "Acesse rotinas e resumos operacionais com contexto inteligente.",
  icon: Icon,
  tone = "from-cyan-300/35 via-sky-200/30 to-violet-200/25",
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/60 p-6 text-left shadow-[0_20px_50px_rgba(148,163,184,0.14)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/74 hover:shadow-[0_24px_60px_rgba(125,211,252,0.2)]"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone} opacity-80`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),rgba(255,255,255,0))]" />

      <div className="relative z-10 flex h-full min-h-[150px] flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/75 bg-white/80 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            {Icon ? <Icon size={18} /> : <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-slate-400 transition group-hover:text-slate-700">
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {eyebrow}
          </p>
          <h3 className="text-[30px] font-semibold tracking-[-0.04em] text-slate-900">
            {title}
          </h3>
          <p className="max-w-[26ch] text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </button>
  );
}
