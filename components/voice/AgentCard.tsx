"use client"

import { LogOut, PauseCircle, PhoneForwarded } from "lucide-react"
import { formatPhone, formatSeconds } from "@/lib/voice/api"
import { VoiceAgent } from "@/lib/voice/types"

const statusMeta: Record<
  string,
  { label: string; tone: string; panel: string }
> = {
  available: {
    label: "Disponivel",
    tone: "bg-emerald-50 text-emerald-700",
    panel: "from-emerald-50 to-white"
  },
  in_call: {
    label: "Em chamada",
    tone: "bg-sky-50 text-sky-700",
    panel: "from-sky-50 to-white"
  },
  paused: {
    label: "Pausado",
    tone: "bg-amber-50 text-amber-700",
    panel: "from-amber-50 to-white"
  },
  offline: {
    label: "Offline",
    tone: "bg-slate-100 text-slate-600",
    panel: "from-slate-50 to-white"
  },
  ringing: {
    label: "Tocando",
    tone: "bg-orange-50 text-orange-700",
    panel: "from-orange-50 to-white"
  }
}

export default function AgentCard({
  agent,
  activePhone,
  isCurrentUser = false
}: {
  agent: VoiceAgent
  activePhone?: string | null
  isCurrentUser?: boolean
}) {
  const meta = statusMeta[agent.status] || statusMeta.offline
  const statusSinceSeconds = agent.updated_at
    ? Math.max(0, Math.round((Date.now() - new Date(agent.updated_at).getTime()) / 1000))
    : 0

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${meta.panel} p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-0.5 ${
      isCurrentUser ? "border-cyan-300 shadow-[0_16px_36px_-22px_rgba(8,145,178,0.28)]" : "border-[#E5E7EB]"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-950">{agent.name}</p>
          <p className="mt-1 text-sm text-slate-500">Ramal {agent.extension}</p>
          {agent.email ? (
            <p className="mt-1 truncate text-xs text-slate-400">{agent.email}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {isCurrentUser ? (
            <span className="rounded-full bg-cyan-500 px-3 py-1 text-[11px] font-semibold text-white">
              Seu ramal
            </span>
          ) : null}
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}>
            {meta.label}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-white/70 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tempo no status</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatSeconds(statusSinceSeconds)}
          </p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ligacao atual</p>
          <p className="mt-2 text-sm font-medium text-slate-700">
            {activePhone ? formatPhone(activePhone) : "Sem chamada ativa"}
          </p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Login SIP</p>
          <p className="mt-2 text-sm font-medium text-slate-700">{agent.extension}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Forcar logout
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <PauseCircle className="h-4 w-4" />
          Colocar em pausa
        </button>
        <button
          type="button"
          disabled={!activePhone}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <PhoneForwarded className="h-4 w-4" />
          Transferir chamada
        </button>
      </div>
    </div>
  )
}
