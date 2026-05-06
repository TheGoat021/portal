"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Delete,
  Mic,
  MicOff,
  Minus,
  Pause,
  Phone,
  PhoneCall,
  X
} from "lucide-react"
import { formatPhone, formatSeconds } from "@/lib/voice/api"
import { useVoiceSoftphoneStore } from "@/store/voiceSoftphoneStore"

const statusLabelMap = {
  idle: "Pronto",
  dialing: "Ligando",
  ringing: "Tocando",
  in_call: "Em chamada",
  on_hold: "Em espera"
}

export default function FloatingSoftphone() {
  const {
    minimized,
    muted,
    status,
    client,
    startedAt,
    openClientHref,
    toggleMinimized,
    setMuted,
    setStatus,
    dialedNumber,
    setDialedNumber,
    appendDialDigit,
    removeLastDialDigit,
    clearDialedNumber,
    startMockCall,
    endCall
  } = useVoiceSoftphoneStore()
  const [elapsed, setElapsed] = useState(0)
  const dialPad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0)
      return
    }

    const update = () => {
      setElapsed(Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)))
    }

    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [startedAt])

  const active = status !== "idle" && Boolean(client)
  const compactLabel = useMemo(() => {
    if (!active) return "Softphone"
    return `${statusLabelMap[status]} ${formatSeconds(elapsed)}`
  }, [active, elapsed, status])

  const handleDial = () => {
    if (!dialedNumber.trim()) return

    startMockCall({
      callId: `outbound-${Date.now()}`,
      clientName: "Discagem manual",
      phone: dialedNumber,
      status: "dialing"
    })
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex max-w-[calc(100vw-1rem)] justify-end">
      <div className="pointer-events-auto">
        {minimized ? (
          <button
            type="button"
            onClick={toggleMinimized}
            className="flex items-center gap-3 rounded-full border border-slate-900 bg-slate-950 px-4 py-3 text-white shadow-[0_24px_60px_-26px_rgba(15,23,42,0.55)]"
          >
            <div className={`rounded-full p-2 ${active ? "bg-emerald-500" : "bg-slate-700"}`}>
              <Phone className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Axion Voice</p>
              <p className="text-sm font-medium">{compactLabel}</p>
            </div>
          </button>
        ) : (
          <div className="w-[min(292px,calc(100vw-1rem))] overflow-hidden rounded-[28px] border border-slate-700 bg-slate-950 text-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.75)]">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-300/70">
                    Axion Voice
                  </p>
                  <h3 className="mt-1 truncate text-sm font-semibold text-white">
                    {client?.name || "Discador Axion"}
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {client?.phone ? formatPhone(client.phone) : "Pronto para discar"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleMinimized}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={endCall}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] px-4 py-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Status</p>
                    <p className="mt-1 text-base font-semibold text-white">{statusLabelMap[status]}</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-400/10 p-2 text-cyan-300">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                  <span>Timer</span>
                  <span className="font-semibold text-amber-300">{formatSeconds(elapsed)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={dialedNumber}
                    onChange={(event) => setDialedNumber(event.target.value)}
                    placeholder="Digite o numero"
                    className="h-10 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 text-center text-sm font-medium tracking-[0.16em] text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={removeLastDialDigit}
                    disabled={!dialedNumber}
                    className="rounded-xl border border-white/10 bg-slate-900 p-2.5 text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {dialPad.map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => appendDialDigit(digit)}
                      className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#1f2937_0%,#111827_100%)] py-2.5 text-lg font-semibold text-white transition hover:border-cyan-400/40 hover:text-cyan-200"
                    >
                      {digit}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus(status === "on_hold" ? "in_call" : "on_hold")}
                    className="rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                  >
                    Hold
                  </button>
                  <button
                    type="button"
                    onClick={handleDial}
                    disabled={!dialedNumber}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-slate-900 px-2 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                  >
                    Transfer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("in_call")}
                  className="rounded-xl bg-emerald-500 px-2 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
                >
                  Atender
                </button>
                <button
                  type="button"
                  onClick={endCall}
                  className="rounded-xl bg-rose-500 px-2 py-2 text-sm font-medium text-white transition hover:bg-rose-400"
                >
                  Recusar
                </button>
                <button
                  type="button"
                  onClick={endCall}
                  className="rounded-xl bg-slate-800 px-2 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Encerrar
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMuted(!muted)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                >
                  {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  Mutar
                </button>
                <button
                  type="button"
                  onClick={clearDialedNumber}
                  disabled={!dialedNumber}
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={toggleMinimized}
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Minimizar
                </button>
              </div>

              <a
                href={openClientHref || "#"}
                className="block rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-center text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15"
              >
                Abrir cliente no CRM
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
