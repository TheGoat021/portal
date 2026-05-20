"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRightLeft,
  Delete,
  ExternalLink,
  Mic,
  MicOff,
  Minus,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Radio
} from "lucide-react"
import { formatPhone, formatSeconds } from "@/lib/voice/api"
import { voiceWebRtcClient } from "@/lib/voice/webrtcClient"
import { useVoiceSoftphoneStore } from "@/store/voiceSoftphoneStore"

const statusLabelMap = {
  idle: "Pronto",
  dialing: "Ligando",
  ringing: "Chamada recebida",
  in_call: "Em chamada",
  on_hold: "Em espera"
}

const connectionToneMap = {
  idle: "text-slate-400",
  connecting: "text-amber-300",
  registered: "text-emerald-300",
  error: "text-rose-300",
  unsupported: "text-slate-400"
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
    startMockCall,
    startWebRtcCallUi,
    endCall,
    runtimeMode,
    connectionStatus,
    connectionMessage,
    errorMessage,
    setErrorMessage,
    callDirection,
    assignedExtension,
    sipUsername
  } = useVoiceSoftphoneStore()
  const [elapsed, setElapsed] = useState(0)
  const [floatingPosition, setFloatingPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const floatingRef = useRef<HTMLDivElement | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragMovedRef = useRef(false)
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

  useEffect(() => {
    if (!floatingPosition) return

    const clampPosition = () => {
      const element = floatingRef.current
      if (!element) return

      const rect = element.getBoundingClientRect()
      const maxX = Math.max(8, window.innerWidth - rect.width - 8)
      const maxY = Math.max(8, window.innerHeight - rect.height - 8)

      setFloatingPosition((current) => {
        if (!current) return current
        return {
          x: Math.min(Math.max(8, current.x), maxX),
          y: Math.min(Math.max(8, current.y), maxY)
        }
      })
    }

    window.addEventListener("resize", clampPosition)
    return () => window.removeEventListener("resize", clampPosition)
  }, [floatingPosition])

  const active = status !== "idle" && Boolean(client)
  const webRtcEnabled = runtimeMode === "webrtc"
  const webRtcRegistered = connectionStatus === "registered"
  const canPlaceCall =
    Boolean(dialedNumber.trim()) && (!webRtcEnabled || webRtcRegistered)
  const registrationHint =
    assignedExtension && !webRtcRegistered
      ? `Ramal ${assignedExtension} provisionado, aguardando registro SIP no navegador.`
      : null
  const compactLabel = useMemo(() => {
    if (!active) return "Softphone"
    return `${statusLabelMap[status]} ${formatSeconds(elapsed)}`
  }, [active, elapsed, status])
  const showIncomingActions = callDirection === "inbound" && status === "ringing"

  const startDragging = (clientX: number, clientY: number) => {
    const element = floatingRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    dragOffsetRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
    dragStartRef.current = { x: clientX, y: clientY }
    dragMovedRef.current = false
    setDragging(true)
    setFloatingPosition({ x: rect.left, y: rect.top })
  }

  const moveFloating = (clientX: number, clientY: number) => {
    const element = floatingRef.current
    if (!element) return

    if (
      Math.abs(clientX - dragStartRef.current.x) > 4 ||
      Math.abs(clientY - dragStartRef.current.y) > 4
    ) {
      dragMovedRef.current = true
    }

    const maxX = Math.max(8, window.innerWidth - element.offsetWidth - 8)
    const maxY = Math.max(8, window.innerHeight - element.offsetHeight - 8)
    const nextX = Math.min(Math.max(8, clientX - dragOffsetRef.current.x), maxX)
    const nextY = Math.min(Math.max(8, clientY - dragOffsetRef.current.y), maxY)

    setFloatingPosition({ x: nextX, y: nextY })
  }

  useEffect(() => {
    if (!dragging) return

    const handlePointerMove = (event: PointerEvent) => {
      moveFloating(event.clientX, event.clientY)
    }

    const handlePointerUp = () => {
      setDragging(false)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [dragging])

  const floatingStyle = floatingPosition
    ? {
        left: `${floatingPosition.x}px`,
        top: `${floatingPosition.y}px`
      }
    : {
        bottom: "1.5rem",
        right: "1.5rem"
      }

  const handleDial = async () => {
    if (!dialedNumber.trim()) return

    setErrorMessage(null)

    if (webRtcEnabled && !webRtcRegistered) {
      setErrorMessage(
        assignedExtension
          ? `O ramal ${assignedExtension} ainda nao concluiu o registro SIP. Revise o WSS, dominio e senha do Asterisk.`
          : "Este usuario ainda nao possui um ramal pronto para registrar no softphone."
      )
      return
    }

    if (webRtcEnabled && webRtcRegistered) {
      try {
        startWebRtcCallUi({
          callId: `outbound-${Date.now()}`,
          clientName: "Discagem Axion",
          phone: dialedNumber,
          status: "dialing",
          direction: "outbound",
          runtimeMode: "webrtc"
        })
        await voiceWebRtcClient.makeCall(dialedNumber)
        return
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Nao foi possivel iniciar a chamada WebRTC."
        setErrorMessage(message)
      }
    }

    startMockCall({
      callId: `outbound-${Date.now()}`,
      clientName: "Discagem manual",
      phone: dialedNumber,
      status: "dialing",
      direction: "outbound"
    })
  }

  const handleAnswer = async () => {
    setErrorMessage(null)

    if (runtimeMode === "webrtc" && callDirection === "inbound") {
      try {
        await voiceWebRtcClient.answerCall()
        setStatus("in_call")
        return
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Nao foi possivel atender a chamada."
        setErrorMessage(message)
      }
    }

    setStatus("in_call")
  }

  const handleReject = async () => {
    setErrorMessage(null)

    if (runtimeMode === "webrtc") {
      try {
        await voiceWebRtcClient.rejectCall()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Nao foi possivel recusar a chamada."
        setErrorMessage(message)
      }
    }

    endCall()
  }

  const handleHangup = async () => {
    setErrorMessage(null)

    if (runtimeMode === "webrtc") {
      try {
        await voiceWebRtcClient.hangup()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Nao foi possivel encerrar a chamada."
        setErrorMessage(message)
      }
    }

    endCall()
  }

  const handleMuteToggle = () => {
    const nextValue = !muted
    setMuted(nextValue)

    if (runtimeMode === "webrtc") {
      voiceWebRtcClient.setMuted(nextValue)
    }
  }

  const handleTransfer = () => {
    setErrorMessage("Transferencia em desenvolvimento.")
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        ref={floatingRef}
        style={floatingStyle}
        className="pointer-events-auto absolute max-w-[calc(100vw-1rem)]"
      >
        {minimized ? (
          <button
            type="button"
            onClick={() => {
              if (dragMovedRef.current) {
                dragMovedRef.current = false
                return
              }
              toggleMinimized()
            }}
            onPointerDown={(event) => {
              startDragging(event.clientX, event.clientY)
            }}
            className="flex items-center gap-3 rounded-full border border-slate-900 bg-slate-950 px-4 py-3 text-white shadow-[0_24px_60px_-26px_rgba(15,23,42,0.55)]"
            style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
          >
            <div className={`rounded-full p-2 ${active ? "bg-emerald-500" : "bg-slate-700"}`}>
              <Phone className="h-4 w-4" />
            </div>
            <div className="text-left text-sm font-medium">{compactLabel}</div>
          </button>
        ) : (
          <div className="w-[min(240px,calc(100vw-1rem))] overflow-hidden rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top,#15213c_0%,#060914_38%,#03050a_100%)] text-white shadow-[0_22px_54px_-26px_rgba(15,23,42,0.75)]">
            <div className="px-3 pb-3 pt-2.5">
              <div
                onPointerDown={(event) => {
                  const target = event.target as HTMLElement
                  if (target.closest("button, a, input")) return
                  startDragging(event.clientX, event.clientY)
                }}
                className="flex items-center justify-between text-[9px] text-slate-400"
                style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span className={`inline-flex items-center gap-1 ${connectionToneMap[connectionStatus]}`}>
                    <Radio className="h-3 w-3" />
                    {assignedExtension ? `Ramal ${assignedExtension}` : "Sem ramal"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMinimized}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <div className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] text-emerald-300">
                    {connectionStatus === "registered" ? "Online" : "Offline"}
                  </div>
                </div>
              </div>

              <div className="px-1.5 pb-2 pt-4 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <PhoneIncoming className="h-5 w-5 text-slate-200" />
                </div>
                <p className="mt-3 text-[30px] font-semibold tracking-[0.18em] text-white">
                  {dialedNumber || client?.phone || assignedExtension || "0000"}
                </p>
                {client?.name ? (
                  <p className="mt-1 text-sm font-medium text-white">{client.name}</p>
                ) : null}
                {client?.phone ? (
                  <p className="mt-1 text-[10px] text-slate-400">{formatPhone(client.phone)}</p>
                ) : null}
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${webRtcRegistered ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span>{statusLabelMap[status]}</span>
                  {active ? <span className="text-slate-500">•</span> : null}
                  {active ? <span>{formatSeconds(elapsed)}</span> : null}
                </div>
                {sipUsername ? (
                  <p className="mt-1 text-[9px] text-slate-500">Login {sipUsername}</p>
                ) : null}
                {registrationHint ? (
                  <p className="mt-2.5 rounded-2xl border border-amber-300/15 bg-amber-300/10 px-2 py-1.5 text-[10px] text-amber-100">
                    {registrationHint}
                  </p>
                ) : null}
                {errorMessage ? (
                  <p className="mt-2.5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-2 py-1.5 text-[10px] text-rose-100">
                    {errorMessage}
                  </p>
                ) : null}
                {!errorMessage && !registrationHint ? (
                  <p className="mt-2.5 text-[9px] text-slate-500">{connectionMessage}</p>
                ) : null}
              </div>

              <div className="px-2">
                <input
                  value={dialedNumber}
                  onChange={(event) => setDialedNumber(event.target.value)}
                  placeholder="Digite o numero"
                  className="h-6 w-full border-none bg-transparent px-2 text-center text-[11px] font-medium tracking-[0.24em] text-slate-300 outline-none placeholder:text-slate-600"
                />

                <div className="mt-1 grid grid-cols-3 gap-x-3 gap-y-0.5">
                  {dialPad.map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => appendDialDigit(digit)}
                      className="rounded-full py-1.5 text-[19px] font-light text-white transition hover:bg-white/8"
                    >
                      {digit}
                    </button>
                  ))}
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2 pb-0.5 pt-0.5">
                  <div className="flex items-center gap-1">
                    <a
                      href={openClientHref || "#"}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
                      aria-disabled={!openClientHref}
                      aria-label="Abrir cliente no CRM"
                      onClick={(event) => {
                        if (!openClientHref) {
                          event.preventDefault()
                        }
                      }}
                    >
                      <ExternalLink className="h-4.5 w-4.5" />
                    </a>
                    <button
                      type="button"
                      onClick={handleTransfer}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
                      aria-label="Transferir chamada"
                    >
                      <ArrowRightLeft className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {showIncomingActions ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleReject()}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-400"
                      >
                        <PhoneOff className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAnswer()}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400"
                      >
                        <Phone className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void (status === "in_call" || status === "on_hold" ? handleHangup() : handleDial())
                      }
                      disabled={status === "idle" ? !canPlaceCall : false}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
                    >
                      {status === "in_call" || status === "on_hold" ? (
                        <PhoneOff className="h-5 w-5" />
                      ) : (
                        <Phone className="h-5 w-5" />
                      )}
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleMuteToggle}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      {muted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={removeLastDialDigit}
                      disabled={!dialedNumber}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Delete className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
