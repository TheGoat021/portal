"use client"

import { Activity, Headset, PauseCircle, PhoneForwarded, Users } from "lucide-react"

export default function MonitoringHero({
  title,
  description,
  items
}: {
  title: string
  description: string
  items: Array<{
    label: string
    value: string
    hint: string
    tone?: "emerald" | "amber" | "rose" | "sky" | "slate"
  }>
}) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  } as const

  return (
    <section className="rounded-[26px] border border-[#d9e2ec] bg-[linear-gradient(145deg,#08111f_0%,#102038_45%,#f8fbff_45%,#f8fbff_100%)] p-4 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.38)]">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <div className="rounded-[22px] border border-white/10 bg-slate-950/75 p-5 text-white backdrop-blur">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
            <Activity className="h-4 w-4" />
            Axion Voice Live
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{description}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
            {[
              { icon: Users, label: "Ramais em tempo real" },
              { icon: Headset, label: "Filas em monitoramento" },
              { icon: PhoneForwarded, label: "Pronto para eventos SIP/WS" },
              { icon: PauseCircle, label: "Alta densidade visual" }
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-[#d9e2ec] bg-white/92 p-4 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.22)] backdrop-blur"
            >
              <div
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  toneMap[item.tone ?? "slate"]
                }`}
              >
                {item.label}
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
