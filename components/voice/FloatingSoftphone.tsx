/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  Copy,
  Delete,
  ExternalLink,
  Mic,
  MicOff,
  Minus,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Radio,
  Settings2
} from "lucide-react"
import { formatPhone, formatSeconds } from "@/lib/voice/api"
import {
  sanitizeSipConnectionProfile,
  validateSipConnectionProfile,
  voiceWebRtcClient
} from "@/lib/voice/webrtcClient"
import type { SipConnectionProfile, VoiceWebRtcCallbacks } from "@/lib/voice/webrtcTypes"
import { useVoiceSoftphoneStore } from "@/store/voiceSoftphoneStore"

const statusLabelMap = {
  idle: "Pronto",
  dialing: "Ligando",
  ringing: "Chamada recebida",
  in_call: "Em chamada",
  on_hold: "Em espera"
}

const connectionLabelMap = {
  disconnected: "Desconectado",
  config_invalid: "Configuracao invalida",
  validating: "Validando configuracao",
  connecting_wss: "Conectando ao WSS",
  wss_connected: "WSS conectado",
  registering: "Registrando ramal",
  registered: "Ramal registrado",
  reconnecting: "Reconectando",
  auth_failed: "Falha de autenticacao",
  transport_failed: "Falha de transporte",
  certificate_error: "Certificado recusado",
  microphone_blocked: "Microfone bloqueado",
  media_error: "Falha de midia",
  unsupported: "Sem suporte"
}

const connectionToneMap = {
  disconnected: "text-slate-400",
  config_invalid: "text-amber-300",
  validating: "text-amber-300",
  connecting_wss: "text-amber-300",
  wss_connected: "text-cyan-300",
  registering: "text-cyan-300",
  registered: "text-emerald-300",
  reconnecting: "text-amber-300",
  auth_failed: "text-rose-300",
  transport_failed: "text-rose-300",
  certificate_error: "text-rose-300",
  microphone_blocked: "text-rose-300",
  media_error: "text-amber-300",
  unsupported: "text-slate-400"
}

type CustomFormState = {
  profileName: string
  websocketUrl: string
  proxySip: string
  sipDomain: string
  sipUsername: string
  authorizationUsername: string
  password: string
  displayName: string
  realm: string
  sipUri: string
  stunServers: string
  turnServers: string
  turnUsername: string
  turnPassword: string
  dialPrefix: string
  registerExpires: string
  remoteIdentityHeaderOrder: string
}

function buildCallbacks(): VoiceWebRtcCallbacks {
  return {
    onConnectionStateChange: ({ connectionState, message, registrationState }) => {
      useVoiceSoftphoneStore.getState().setConnectionState(connectionState, message, registrationState)
    },
    onCallStateChange: (call) => {
      useVoiceSoftphoneStore.getState().syncCallSnapshot(call)
    },
    onCallEnded: (call) => {
      useVoiceSoftphoneStore.getState().endCall(call)
    },
    onDiagnosticEvent: (event) => {
      useVoiceSoftphoneStore.getState().addDiagnosticEvent(event)
    },
    onError: (message, state, sipCode) => {
      const store = useVoiceSoftphoneStore.getState()
      store.setErrorMessage(message)
      if (state) store.setConnectionState(state, message)
      store.addDiagnosticEvent({
        category: "error",
        state: state ?? "transport_failed",
        message,
        sipCode: sipCode ?? null
      })
    }
  }
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

function buildCustomProfile(form: CustomFormState): SipConnectionProfile {
  return {
    id: "custom-active",
    provider: "custom",
    profileName: form.profileName.trim() || "Conta Custom",
    websocketUrl: form.websocketUrl.trim(),
    sipDomain: form.sipDomain.trim(),
    sipUsername: form.sipUsername.trim(),
    authorizationUsername: form.authorizationUsername.trim(),
    password: form.password,
    displayName: form.displayName.trim() || form.sipUsername.trim(),
    realm: form.realm.trim() || null,
    sipUri: form.proxySip.trim() || form.sipUri.trim() || null,
    stunServers: splitCsv(form.stunServers),
    turnServers: splitCsv(form.turnServers),
    turnUsername: form.turnUsername.trim() || null,
    turnPassword: form.turnPassword || null,
    dialPrefix: form.dialPrefix.trim() || null,
    registerExpires: form.registerExpires.trim() ? Number(form.registerExpires) : 300,
    remoteIdentityHeaderOrder: splitCsv(form.remoteIdentityHeaderOrder).length
      ? splitCsv(form.remoteIdentityHeaderOrder)
      : ["P-Asserted-Identity", "Remote-Party-ID", "From"]
  }
}

function Field(props: {
  label: string
  value: string
  type?: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {props.label}
      </span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-500"
      />
    </label>
  )
}

function buildDiagnosticText() {
  const store = useVoiceSoftphoneStore.getState()
  return [
    `Provedor: ${store.providerMode}`,
    `Conexao: ${store.connectionState}`,
    `Registro: ${store.registrationState}`,
    `Mensagem: ${store.connectionMessage}`,
    store.activeSipProfile
      ? `Perfil: ${JSON.stringify(store.activeSipProfile, null, 2)}`
      : "Perfil: nenhum ativo",
    store.currentCall
      ? `Chamada: ${JSON.stringify(
          {
            direction: store.currentCall.direction,
            status: store.currentCall.status,
            remoteNumber: store.currentCall.remoteNumber,
            remoteName: store.currentCall.remoteName,
            callId: store.currentCall.technical.callId,
            ringingAt: store.currentCall.ringingAt,
            answeredAt: store.currentCall.answeredAt,
            endedAt: store.currentCall.endedAt,
            headersFound: store.currentCall.technical.remoteHeadersFound
          },
          null,
          2
        )}`
      : "Chamada: nenhuma ativa",
    "Eventos:",
    ...store.diagnostics.map(
      (event) =>
        `[${event.timestamp}] ${event.category} | ${event.state} | ${event.message}${
          event.sipCode ? ` | SIP ${event.sipCode}` : ""
        }`
    )
  ].join("\n")
}

export default function FloatingSoftphone() {
  const {
    minimized,
    muted,
    status,
    client,
    startedAt,
    answeredAt,
    ringingAt,
    openClientHref,
    toggleMinimized,
    setMuted,
    setRuntimeMode,
    setProviderMode,
    dialedNumber,
    setDialedNumber,
    appendDialDigit,
    removeLastDialDigit,
    startMockCall,
    endCall,
    runtimeMode,
    providerMode,
    connectionState,
    registrationState,
    connectionMessage,
    errorMessage,
    setErrorMessage,
    callDirection,
    assignedExtension,
    sipUsername,
    activeSipProfile,
    setActiveSipProfile,
    diagnostics,
    clearDiagnostics,
    currentCall
  } = useVoiceSoftphoneStore()
  const [elapsed, setElapsed] = useState(0)
  const [floatingPosition, setFloatingPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [authTouched, setAuthTouched] = useState(false)
  const [customForm, setCustomForm] = useState<CustomFormState>({
    profileName: "Conta Custom",
    websocketUrl: "",
    proxySip: "",
    sipDomain: "",
    sipUsername: "",
    authorizationUsername: "",
    password: "",
    displayName: "",
    realm: "",
    sipUri: "",
    stunServers: "",
    turnServers: "",
    turnUsername: "",
    turnPassword: "",
    dialPrefix: "",
    registerExpires: "300",
    remoteIdentityHeaderOrder: "P-Asserted-Identity, Remote-Party-ID, From"
  })
  const floatingRef = useRef<HTMLDivElement | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragMovedRef = useRef(false)
  const dialPad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]
  const active = status !== "idle" && Boolean(client)
  const webRtcEnabled = runtimeMode === "webrtc"
  const registered = registrationState === "registered" && connectionState === "registered"
  const canPlaceCall = Boolean(dialedNumber.trim()) && (!webRtcEnabled || registered) && status === "idle"
  const compactLabel = useMemo(
    () => (active ? `${statusLabelMap[status]} ${formatSeconds(elapsed)}` : "Softphone"),
    [active, elapsed, status]
  )
  const showIncomingActions = callDirection === "inbound" && status === "ringing"
  const baseTimestamp = status === "in_call" ? answeredAt ?? startedAt : ringingAt ?? startedAt

  useEffect(() => {
    if (!baseTimestamp) {
      setElapsed(0)
      return
    }
    const update = () =>
      setElapsed(Math.max(0, Math.round((Date.now() - new Date(baseTimestamp).getTime()) / 1000)))
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [baseTimestamp])

  useEffect(() => {
    if (!floatingPosition) return
    const clampPosition = () => {
      const element = floatingRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const maxX = Math.max(8, window.innerWidth - rect.width - 8)
      const maxY = Math.max(8, window.innerHeight - rect.height - 8)
      setFloatingPosition((current) =>
        current
          ? { x: Math.min(Math.max(8, current.x), maxX), y: Math.min(Math.max(8, current.y), maxY) }
          : current
      )
    }
    window.addEventListener("resize", clampPosition)
    return () => window.removeEventListener("resize", clampPosition)
  }, [floatingPosition])

  useEffect(() => {
    if (!dragging) return
    const handlePointerMove = (event: PointerEvent) => {
      const element = floatingRef.current
      if (!element) return
      if (
        Math.abs(event.clientX - dragStartRef.current.x) > 4 ||
        Math.abs(event.clientY - dragStartRef.current.y) > 4
      ) {
        dragMovedRef.current = true
      }
      const maxX = Math.max(8, window.innerWidth - element.offsetWidth - 8)
      const maxY = Math.max(8, window.innerHeight - element.offsetHeight - 8)
      setFloatingPosition({
        x: Math.min(Math.max(8, event.clientX - dragOffsetRef.current.x), maxX),
        y: Math.min(Math.max(8, event.clientY - dragOffsetRef.current.y), maxY)
      })
    }
    const handlePointerUp = () => setDragging(false)
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [dragging])

  const startDragging = (clientX: number, clientY: number) => {
    const element = floatingRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    dragOffsetRef.current = { x: clientX - rect.left, y: clientY - rect.top }
    dragStartRef.current = { x: clientX, y: clientY }
    dragMovedRef.current = false
    setDragging(true)
    setFloatingPosition({ x: rect.left, y: rect.top })
  }

  const floatingStyle = floatingPosition
    ? { left: `${floatingPosition.x}px`, top: `${floatingPosition.y}px` }
    : { bottom: "1.5rem", right: "1.5rem" }

  const switchProvider = async (nextProvider: "axion" | "custom") => {
    if (status !== "idle") {
      setErrorMessage("Finalize a chamada atual antes de trocar o provedor.")
      return
    }
    setErrorMessage(null)
    await voiceWebRtcClient.destroy()
    setActiveSipProfile(null)
    setProviderMode(nextProvider)
  }

  const connectCustom = async (requestMicrophone: boolean) => {
    const profile = buildCustomProfile(customForm)
    const errors = validateSipConnectionProfile(profile)
    if (errors.length > 0) {
      setErrorMessage(errors.join(" "))
      return
    }
    if (status !== "idle") {
      setErrorMessage("Finalize a chamada atual antes de ativar outro provedor.")
      return
    }
    setErrorMessage(null)
    clearDiagnostics()
    if (providerMode !== "custom") {
      await voiceWebRtcClient.destroy()
      setProviderMode("custom")
    }
    setRuntimeMode("webrtc")
    try {
      await voiceWebRtcClient.initialize(profile, buildCallbacks(), { requestMicrophone })
      setActiveSipProfile(sanitizeSipConnectionProfile(profile))
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nao foi possivel conectar o perfil Custom."
      )
    }
  }

  const handleDial = async () => {
    if (!dialedNumber.trim()) return
    setErrorMessage(null)
    if (webRtcEnabled && !registered) {
      setErrorMessage("O ramal ainda nao concluiu o registro SIP. Revise WSS, dominio, usuario e senha.")
      return
    }
    if (webRtcEnabled && registered) {
      try {
        await voiceWebRtcClient.makeCall(dialedNumber)
        return
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Nao foi possivel iniciar a chamada WebRTC."
        )
      }
      return
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
    if (runtimeMode !== "webrtc" || callDirection !== "inbound") return
    try {
      await voiceWebRtcClient.answerCall()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel atender a chamada.")
    }
  }

  const handleReject = async () => {
    setErrorMessage(null)
    if (runtimeMode === "webrtc") {
      try {
        await voiceWebRtcClient.rejectCall()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel recusar a chamada.")
      }
      return
    }
    endCall()
  }

  const handleHangup = async () => {
    setErrorMessage(null)
    if (runtimeMode === "webrtc") {
      try {
        await voiceWebRtcClient.hangup()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel encerrar a chamada.")
      }
      return
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

  const handleCopyDiagnostics = async () => {
    await navigator.clipboard.writeText(buildDiagnosticText())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div ref={floatingRef} style={floatingStyle} className="pointer-events-auto absolute max-w-[calc(100vw-1rem)]">
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
            onPointerDown={(event) => startDragging(event.clientX, event.clientY)}
            className="flex items-center gap-3 rounded-full border border-slate-900 bg-slate-950 px-4 py-3 text-white shadow-[0_24px_60px_-26px_rgba(15,23,42,0.55)]"
            style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
          >
            <div className={`rounded-full p-2 ${active ? "bg-emerald-500" : "bg-slate-700"}`}>
              <Phone className="h-4 w-4" />
            </div>
            <div className="text-left text-sm font-medium">{compactLabel}</div>
          </button>
        ) : (
          <div className="relative w-[min(320px,calc(100vw-1rem))] overflow-hidden rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top,#15213c_0%,#060914_38%,#03050a_100%)] text-white shadow-[0_22px_54px_-26px_rgba(15,23,42,0.75)]">
            <div className="px-3 pb-3 pt-2.5">
              <div
                onPointerDown={(event) => {
                  const target = event.target as HTMLElement
                  if (target.closest("button, a, input, textarea, select")) return
                  startDragging(event.clientX, event.clientY)
                }}
                className="flex items-center justify-between text-[9px] text-slate-400"
                style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span className={`inline-flex items-center gap-1 ${connectionToneMap[connectionState]}`}>
                    <Radio className="h-3 w-3" />
                    {providerMode === "axion" ? "Axion Voice" : "Custom"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSettingsOpen((value) => !value)} className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white">
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={toggleMinimized} className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <div className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] text-emerald-300">{registered ? "Online" : "Offline"}</div>
                </div>
              </div>
              <div className="px-1.5 pb-2 pt-4 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <PhoneIncoming className="h-5 w-5 text-slate-200" />
                </div>
                <p className="mt-3 text-[30px] font-semibold tracking-[0.18em] text-white">
                  {dialedNumber || client?.phone || assignedExtension || "0000"}
                </p>
                {client?.name ? <p className="mt-1 text-sm font-medium text-white">{client.name}</p> : null}
                {client?.phone ? <p className="mt-1 text-[10px] text-slate-400">{formatPhone(client.phone)}</p> : null}
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${registered ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span>{statusLabelMap[status]}</span>
                  {active ? <span className="text-slate-500">|</span> : null}
                  {active ? <span>{formatSeconds(elapsed)}</span> : null}
                </div>
                <p className="mt-1 text-[9px] text-slate-500">{connectionLabelMap[connectionState]}</p>
                {sipUsername ? <p className="mt-1 text-[9px] text-slate-500">Login {sipUsername}</p> : null}
                {activeSipProfile ? <p className="mt-1 text-[9px] text-slate-500">{activeSipProfile.profileName} | {activeSipProfile.sipDomain}</p> : null}
                {errorMessage ? (
                  <p className="mt-2.5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-2 py-1.5 text-[10px] text-rose-100">{errorMessage}</p>
                ) : (
                  <p className="mt-2.5 text-[9px] text-slate-500">{connectionMessage}</p>
                )}
                <p className="mt-2 text-[9px] text-amber-200/80">Para o primeiro teste Custom, mantenha apenas uma aba do portal aberta.</p>
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
                    <button key={digit} type="button" onClick={() => appendDialDigit(digit)} className="rounded-full py-1.5 text-[19px] font-light text-white transition hover:bg-white/8">
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
                      onClick={(event) => { if (!openClientHref) event.preventDefault() }}
                    >
                      <ExternalLink className="h-4.5 w-4.5" />
                    </a>
                    <button type="button" onClick={() => setErrorMessage("Transferencia em desenvolvimento.")} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white">
                      <ArrowRightLeft className="h-4.5 w-4.5" />
                    </button>
                  </div>
                  {showIncomingActions ? (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => void handleReject()} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-400">
                        <PhoneOff className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => void handleAnswer()} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400">
                        <Phone className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => void (status === "in_call" || status === "on_hold" ? handleHangup() : handleDial())} disabled={status === "idle" ? !canPlaceCall : false} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800">
                      {status === "in_call" || status === "on_hold" ? <PhoneOff className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={handleMuteToggle} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white">
                      {muted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                    </button>
                    <button type="button" onClick={removeLastDialDigit} disabled={!dialedNumber} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                      <Delete className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {settingsOpen ? (
              <div className="absolute inset-0 overflow-y-auto bg-slate-950/95 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Configuracao do softphone</h3>
                  <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">Fechar</button>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-400">Provedor</span>
                    <select value={providerMode} onChange={(event) => void switchProvider(event.target.value as "axion" | "custom")} className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none">
                      <option value="axion" className="bg-slate-950">Axion Voice</option>
                      <option value="custom" className="bg-slate-950">Custom</option>
                    </select>
                  </label>

                  {providerMode === "custom" ? (
                    <div className="space-y-3">
                      <Field label="Nome da conta" value={customForm.profileName} onChange={(value) => setCustomForm((current) => ({ ...current, profileName: value }))} />
                      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-3 text-[11px] text-cyan-50">
                        Preencha como em um softphone comum. Nesta tela, o campo <strong>Servidor SIP</strong> deve receber a URL completa em <strong>wss://</strong>, porque no navegador o transporte precisa ser WebSocket seguro.
                      </div>
                      <Field label="Servidor SIP" value={customForm.websocketUrl} placeholder="wss://pbx.exemplo.local:8089/ws" onChange={(value) => setCustomForm((current) => ({ ...current, websocketUrl: value }))} />
                      <Field label="Proxy SIP" value={customForm.proxySip} placeholder="Opcional" onChange={(value) => setCustomForm((current) => ({ ...current, proxySip: value }))} />
                      <Field label="Usuario" value={customForm.sipUsername} onChange={(value) => setCustomForm((current) => ({ ...current, sipUsername: value, authorizationUsername: authTouched ? current.authorizationUsername : value, displayName: current.displayName || value }))} />
                      <Field label="Dominio" value={customForm.sipDomain} onChange={(value) => setCustomForm((current) => ({ ...current, sipDomain: value }))} />
                      <Field label="Login" value={customForm.authorizationUsername} onChange={(value) => { setAuthTouched(true); setCustomForm((current) => ({ ...current, authorizationUsername: value })) }} />
                      <label className="block">
                        <span className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-400">Senha</span>
                        <div className="flex gap-2">
                          <input type={showPassword ? "text" : "password"} value={customForm.password} onChange={(event) => setCustomForm((current) => ({ ...current, password: event.target.value }))} className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none" />
                          <button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-xl border border-white/10 px-3 text-xs text-slate-300">{showPassword ? "Ocultar" : "Mostrar"}</button>
                        </div>
                      </label>
                      <button type="button" onClick={() => setShowAdvanced((value) => !value)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200">
                        <span>Configuracoes avancadas</span>
                        <ChevronDown className={`h-4 w-4 transition ${showAdvanced ? "rotate-180" : ""}`} />
                      </button>
                      {showAdvanced ? (
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                          <Field label="Nome de exibicao" value={customForm.displayName} onChange={(value) => setCustomForm((current) => ({ ...current, displayName: value }))} />
                          <Field label="Realm" value={customForm.realm} onChange={(value) => setCustomForm((current) => ({ ...current, realm: value }))} />
                          <Field label="SIP URI / AOR" value={customForm.sipUri} onChange={(value) => setCustomForm((current) => ({ ...current, sipUri: value }))} />
                          <Field label="STUN (CSV)" value={customForm.stunServers} placeholder="stun:host:porta" onChange={(value) => setCustomForm((current) => ({ ...current, stunServers: value }))} />
                          <Field label="TURN (CSV)" value={customForm.turnServers} placeholder="turn:host:porta" onChange={(value) => setCustomForm((current) => ({ ...current, turnServers: value }))} />
                          <Field label="Usuario TURN" value={customForm.turnUsername} onChange={(value) => setCustomForm((current) => ({ ...current, turnUsername: value }))} />
                          <Field label="Senha TURN" type={showPassword ? "text" : "password"} value={customForm.turnPassword} onChange={(value) => setCustomForm((current) => ({ ...current, turnPassword: value }))} />
                          <Field label="Prefixo de discagem" value={customForm.dialPrefix} onChange={(value) => setCustomForm((current) => ({ ...current, dialPrefix: value }))} />
                          <Field label="Expiracao do registro" value={customForm.registerExpires} onChange={(value) => setCustomForm((current) => ({ ...current, registerExpires: value }))} />
                          <Field label="Ordem de identificacao" value={customForm.remoteIdentityHeaderOrder} onChange={(value) => setCustomForm((current) => ({ ...current, remoteIdentityHeaderOrder: value }))} />
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => void connectCustom(false)} className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950">Testar conexao</button>
                        <button type="button" onClick={() => void connectCustom(true)} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950">Ativar softphone</button>
                        <button type="button" onClick={() => void voiceWebRtcClient.destroy().then(() => setActiveSipProfile(null))} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200">Desconectar</button>
                        <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                      O modo Axion continua sendo inicializado automaticamente a partir da configuracao existente do portal.
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-white">Diagnostico seguro</p>
                        <p className="text-[10px] text-slate-400">Sem senha, TURN credential, Authorization ou SDP completo.</p>
                      </div>
                      <button type="button" onClick={() => void handleCopyDiagnostics()} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-2 py-1 text-xs text-slate-200">
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <div className="mt-3 max-h-40 space-y-2 overflow-y-auto text-[11px] text-slate-300">
                      {diagnostics.length === 0 ? (
                        <p className="text-slate-500">Nenhum evento registrado ainda.</p>
                      ) : (
                        diagnostics.slice().reverse().map((event) => (
                          <div key={event.id} className="rounded-xl border border-white/5 bg-slate-950/70 p-2">
                            <p className="text-[10px] text-slate-500">{new Date(event.timestamp).toLocaleString("pt-BR")}</p>
                            <p className="mt-1 text-white">{event.category} | {event.state}</p>
                            <p className="text-slate-300">{event.message}{event.sipCode ? ` | SIP ${event.sipCode}` : ""}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {currentCall ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-slate-300">
                      <p className="text-xs font-semibold text-white">Dados tecnicos da chamada</p>
                      <p className="mt-2">Call-ID: {currentCall.technical.callId || "Nao identificado"}</p>
                      <p>Numero remoto: {currentCall.remoteNumber}</p>
                      <p>Nome remoto: {currentCall.remoteName || "Nao identificado"}</p>
                      <p>Cabecalhos encontrados: {currentCall.technical.remoteHeadersFound.join(", ") || "Nenhum"}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
