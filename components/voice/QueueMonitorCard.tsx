"use client"

import { Clock3, PhoneIncoming, Users } from "lucide-react"
import { formatPhone, formatSeconds } from "@/lib/voice/api"
import { QueueMonitorCardData } from "@/lib/voice/monitoring"

const toneMap = {
  healthy: {
    border: "border-emerald-200",
    panel: "from-emerald-50 via-white to-white",
    badge: "bg-emerald-500 text-white",
    text: "text-emerald-700"
  },
  warning: {
    border: "border-amber-200",
    panel: "from-amber-50 via-white to-white",
    badge: "bg-amber-500 text-white",
    text: "text-amber-700"
  },
  critical: {
    border: "border-rose-200",
    panel: "from-rose-50 via-white to-white",
    badge: "bg-rose-500 text-white",
    text: "text-rose-700"
  },
  idle: {
    border: "border-sky-200",
    panel: "from-sky-50 via-white to-white",
    badge: "bg-sky-500 text-white",
    text: "text-sky-700"
  },
  receiving: {
    border: "border-orange-200",
    panel: "from-orange-50 via-white to-white",
    badge: "bg-orange-500 text-white",
    text: "text-orange-700"
  }
} as const

export default function QueueMonitorCard({ queue }: { queue: QueueMonitorCardData }) {
  const tone = toneMap[queue.tone]

  return (
    <article
      className={`min-w-[310px] rounded-[22px] border bg-gradient-to-br ${tone.panel} p-4 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.24)] transition duration-300 hover:-translate-y-0.5 ${tone.border} ${
        queue.isBlinking ? "animate-[pulse_2.8s_ease-in-out_infinite]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase tracking-[0.22em] text-slate-900">
            {queue.name}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5" />
            <span>{queue.waitingCount} aguardando</span>
            <Clock3 className="ml-1 h-3.5 w-3.5" />
            <span>{formatSeconds(queue.oldestWaitSeconds)}</span>
          </div>
        </div>

        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}>
          {queue.waitingCount === 0 ? "Sem fila" : queue.tone === "critical" ? "Congestionada" : queue.tone === "warning" ? "Atencao" : queue.tone === "receiving" ? "Nova chamada" : "Saudavel"}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {queue.entries.map((entry) => (
          <div
            key={entry.id}
            className={`rounded-2xl border border-white/80 bg-white/88 px-3 py-3 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.25)] ${
              entry.isNew ? "ring-1 ring-orange-300" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <span>{entry.totalWaiting} no total</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className={`text-lg font-semibold ${tone.text}`}>{formatSeconds(entry.waitSeconds)}</div>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900">
                  <PhoneIncoming className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{formatPhone(entry.phone)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
