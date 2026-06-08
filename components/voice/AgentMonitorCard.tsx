"use client"

import { Headphones, PauseCircle, PhoneCall, PhoneIncoming, PhoneOff, UserRound } from "lucide-react"
import { formatPhone, formatSeconds } from "@/lib/voice/api"
import { AgentMonitorCardData } from "@/lib/voice/monitoring"

const toneMap = {
  available: {
    panel: "from-emerald-100 via-emerald-50 to-white",
    border: "border-emerald-300",
    text: "text-emerald-900",
    badge: "bg-emerald-600 text-white"
  },
  active: {
    panel: "from-sky-100 via-sky-50 to-white",
    border: "border-sky-300",
    text: "text-sky-950",
    badge: "bg-sky-600 text-white"
  },
  receptive: {
    panel: "from-rose-100 via-rose-50 to-white",
    border: "border-rose-300",
    text: "text-rose-950",
    badge: "bg-rose-600 text-white"
  },
  pause: {
    panel: "from-amber-100 via-amber-50 to-white",
    border: "border-amber-300",
    text: "text-amber-950",
    badge: "bg-amber-500 text-white"
  },
  ringing: {
    panel: "from-orange-100 via-orange-50 to-white",
    border: "border-orange-300",
    text: "text-orange-950",
    badge: "bg-orange-500 text-white"
  },
  logged_out: {
    panel: "from-slate-200 via-slate-100 to-white",
    border: "border-slate-300",
    text: "text-slate-800",
    badge: "bg-slate-500 text-white"
  },
  cancel_receptive: {
    panel: "from-rose-100 via-rose-50 to-white",
    border: "border-rose-300",
    text: "text-rose-950",
    badge: "bg-rose-700 text-white"
  }
} as const

export default function AgentMonitorCard({ agent }: { agent: AgentMonitorCardData }) {
  const tone = toneMap[agent.tone]

  return (
    <article
      className={`rounded-[22px] border bg-gradient-to-br ${tone.panel} p-3.5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)] transition duration-300 hover:-translate-y-0.5 ${tone.border} ${
        agent.isCurrentUser ? "ring-2 ring-cyan-300" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-950">
            <span>{agent.extension}</span>
          </div>
          <p className="mt-1 truncate text-sm font-medium text-slate-800">{agent.name}</p>
        </div>

        <div className="text-right">
          <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}>
            {agent.isAnimated ? <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span> : null}
            {agent.tone === "available" ? "Livre" : agent.tone === "active" ? "Ativo" : agent.tone === "receptive" ? "Receptivo" : agent.tone === "pause" ? "Pausa" : agent.tone === "ringing" ? "Tocando" : agent.tone === "cancel_receptive" ? "Cancelado" : "Deslogado"}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-white/80 bg-white/88 px-3 py-3 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.28)]">
        <div className={`text-[15px] font-semibold uppercase leading-5 ${tone.text}`}>{agent.statusLabel}</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">{agent.statusDetail}</div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-xl font-semibold tracking-tight text-slate-950">{formatSeconds(agent.statusSinceSeconds)}</div>
            <div className="mt-1 text-sm text-slate-600">
              {agent.currentPhone ? formatPhone(agent.currentPhone) : "Sem cliente em linha"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/80 bg-white/80 px-2.5 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
            <PhoneCall className="h-3.5 w-3.5" />
            Total
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{agent.totalCalls}</div>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/80 px-2.5 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
            <Headphones className="h-3.5 w-3.5" />
            Ativas
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{agent.activeCalls}</div>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/80 px-2.5 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
            {agent.tone === "pause" ? <PauseCircle className="h-3.5 w-3.5" /> : agent.currentPhone ? <PhoneIncoming className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
            Recep.
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{agent.receptiveCalls}</div>
        </div>
      </div>

      {agent.currentPhone ? (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/80 bg-white/75 px-3 py-2 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <PhoneOff className="h-3.5 w-3.5" />
            Cliente atual
          </span>
          <span className="font-medium text-slate-900">{formatPhone(agent.currentPhone)}</span>
        </div>
      ) : null}
    </article>
  )
}
