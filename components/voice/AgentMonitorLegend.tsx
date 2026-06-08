"use client"

const items = [
  { label: "Disponivel", color: "bg-emerald-500" },
  { label: "Em ligacao", color: "bg-sky-500" },
  { label: "Receptivo", color: "bg-rose-500" },
  { label: "Pausa", color: "bg-amber-500" },
  { label: "Tocando", color: "bg-orange-500" },
  { label: "Deslogado", color: "bg-slate-500" }
]

export default function AgentMonitorLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-2 rounded-full border border-[#d9e2ec] bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
