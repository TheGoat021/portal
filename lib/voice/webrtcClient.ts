/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { formatPhone } from "@/lib/voice/api"
import type {
  SanitizedSipConnectionProfile,
  SipConnectionProfile,
  SoftphoneCallDirection,
  SoftphoneCallStatus,
  SoftphoneConnectionState,
  SoftphoneRegistrationState,
  VoiceSoftphoneCallSnapshot,
  VoiceSoftphoneDiagnosticEvent,
  VoiceWebRtcCallbacks
} from "@/lib/voice/webrtcTypes"

type SipJsRuntime = { Inviter: any; Registerer: any; SessionState: any; UserAgent: any }
type AxionVoiceEnvConfig = {
  enabled: boolean
  websocketUrl: string
  sipDomain: string
  username: string
  password: string
  displayName: string
  stunServers: string[]
}
type InitializeOptions = { requestMicrophone?: boolean }

const DEFAULT_STUN = "stun:stun.l.google.com:19302"
const DEFAULT_HEADERS = ["P-Asserted-Identity", "Remote-Party-ID", "From"]
const MAX_RECONNECT_ATTEMPTS = 5

const nowIso = () => new Date().toISOString()

function cleanMessage(value: string) {
  return value
    .replace(/authorization:[^\r\n]*/gi, "authorization: [redacted]")
    .replace(/password=[^&\s]+/gi, "password=[redacted]")
    .replace(/:\S+@/g, ":[redacted]@")
    .trim()
}

function codeOf(error: unknown) {
  const candidate = error as
    | { statusCode?: number; message?: { statusCode?: number }; response?: { statusCode?: number } }
    | undefined
  return candidate?.statusCode ?? candidate?.message?.statusCode ?? candidate?.response?.statusCode ?? null
}

function stateFromError(error: unknown): SoftphoneConnectionState {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (message.includes("notallowederror") || message.includes("permission denied")) return "microphone_blocked"
  if (message.includes("certificate") || message.includes("tls") || message.includes("ssl")) return "certificate_error"
  if (message.includes("unauthorized") || message.includes("forbidden") || message.includes("403")) return "auth_failed"
  return "transport_failed"
}

function buildSipUri(profile: SipConnectionProfile) {
  return profile.sipUri?.trim() || `sip:${profile.sipUsername}@${profile.sipDomain}`
}

function headerValue(message: any, name: string) {
  if (!message) return null
  if (typeof message.getHeader === "function") {
    const direct = message.getHeader(name)
    if (direct) return String(direct)
  }
  const header = message.headers?.[name] ?? message.headers?.[name.toLowerCase()]
  if (Array.isArray(header) && header[0]) return String(header[0].raw ?? header[0])
  if (typeof header === "string") return header
  return null
}

function numberFromText(value?: string | null) {
  if (!value) return ""
  const sipUser = value.match(/sip:([^@;>]+)/i)?.[1]
  if (sipUser) return sipUser.replace(/[^\d*#+]/g, "")
  return value.replace(/[^\d*#+]/g, "")
}

function sameProfile(left: SipConnectionProfile | null, right: SipConnectionProfile | null) {
  return Boolean(left && right && JSON.stringify(left) === JSON.stringify(right))
}

function validateIce(values: string[]) {
  return values.every((value) => /^(stun|stuns|turn|turns):/i.test(value))
}

function mapStatus(runtime: SipJsRuntime | null, state: any, direction: SoftphoneCallDirection): SoftphoneCallStatus {
  if (!runtime) return direction === "outbound" ? "dialing" : "ringing"
  switch (state) {
    case runtime.SessionState.Initial:
    case runtime.SessionState.Establishing:
      return direction === "outbound" ? "dialing" : "ringing"
    case runtime.SessionState.Established:
      return "in_call"
    case runtime.SessionState.Terminated:
      return "idle"
    default:
      return direction === "outbound" ? "dialing" : "ringing"
  }
}

export function validateSipConnectionProfile(profile: SipConnectionProfile) {
  const errors: string[] = []
  if (!profile.websocketUrl.trim()) errors.push("Informe a URL WSS.")
  else if (!/^wss:\/\//i.test(profile.websocketUrl.trim())) errors.push("A URL precisa usar wss://.")
  if (!profile.sipDomain.trim()) errors.push("Informe o dominio SIP.")
  if (!profile.sipUsername.trim()) errors.push("Informe o ramal ou usuario SIP.")
  if (!profile.authorizationUsername.trim()) errors.push("Informe o usuario de autenticacao.")
  if (!profile.password.trim()) errors.push("Informe a senha SIP.")
  if (!validateIce(profile.stunServers) || !validateIce(profile.turnServers)) {
    errors.push("Revise os enderecos STUN/TURN informados.")
  }
  return errors
}

export function sanitizeSipConnectionProfile(profile: SipConnectionProfile): SanitizedSipConnectionProfile {
  return {
    id: profile.id,
    provider: profile.provider,
    profileName: profile.profileName,
    websocketUrl: profile.websocketUrl,
    sipDomain: profile.sipDomain,
    sipUsername: profile.sipUsername,
    authorizationUsername: profile.authorizationUsername,
    displayName: profile.displayName,
    realm: profile.realm ?? null,
    sipUri: profile.sipUri ?? null,
    stunServers: [...profile.stunServers],
    turnServers: [...profile.turnServers],
    turnUsername: profile.turnUsername ?? null,
    dialPrefix: profile.dialPrefix ?? null,
    registerExpires: profile.registerExpires ?? null,
    remoteIdentityHeaderOrder: [...profile.remoteIdentityHeaderOrder]
  }
}

export function getVoiceWebRtcConfigFromEnv(): AxionVoiceEnvConfig {
  const stunServers = (process.env.NEXT_PUBLIC_AXION_VOICE_STUN_SERVERS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  return {
    enabled: process.env.NEXT_PUBLIC_AXION_VOICE_WEBRTC_ENABLED === "true",
    websocketUrl: process.env.NEXT_PUBLIC_AXION_VOICE_SIP_WSS_URL ?? "",
    sipDomain: process.env.NEXT_PUBLIC_AXION_VOICE_SIP_DOMAIN ?? "",
    username: process.env.NEXT_PUBLIC_AXION_VOICE_SIP_USERNAME ?? "",
    password: process.env.NEXT_PUBLIC_AXION_VOICE_SIP_PASSWORD ?? "",
    displayName: process.env.NEXT_PUBLIC_AXION_VOICE_SIP_DISPLAY_NAME ?? "Axion Voice",
    stunServers
  }
}

class VoiceWebRtcClient {
  private runtime: SipJsRuntime | null = null
  private userAgent: any = null
  private registerer: any = null
  private session: any = null
  private callbacks: VoiceWebRtcCallbacks | null = null
  private started = false
  private activeProfile: SipConnectionProfile | null = null
  private initPromise: Promise<void> | null = null
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private manualDisconnect = false
  private remoteAudioElement: HTMLAudioElement | null = null
  private remoteAudioStream: MediaStream | null = null
  private ringtoneContext: AudioContext | null = null
  private ringtoneInterval: number | null = null
  private sessionSnapshots = new Map<any, VoiceSoftphoneCallSnapshot>()

  private emitConnection(connectionState: SoftphoneConnectionState, message: string, registrationState: SoftphoneRegistrationState) {
    this.callbacks?.onConnectionStateChange({ connectionState, registrationState, message: cleanMessage(message) })
  }

  private emitDiagnostic(event: Omit<VoiceSoftphoneDiagnosticEvent, "id" | "timestamp">) {
    this.callbacks?.onDiagnosticEvent({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: nowIso(),
      category: event.category,
      state: event.state,
      message: cleanMessage(event.message),
      sipCode: event.sipCode ?? null
    })
  }

  private emitError(message: string, state: SoftphoneConnectionState, sipCode?: number | null) {
    this.callbacks?.onError(cleanMessage(message), state, sipCode ?? null)
  }

  private ensureAudio() {
    if (typeof window === "undefined") return null
    if (!this.remoteAudioElement) {
      const audio = window.document.createElement("audio")
      audio.autoplay = true
      audio.setAttribute("playsinline", "true")
      audio.hidden = true
      window.document.body.appendChild(audio)
      this.remoteAudioElement = audio
    }
    return this.remoteAudioElement
  }

  private async playRemoteAudio() {
    const audio = this.ensureAudio()
    if (!audio) return
    try {
      await audio.play()
    } catch {
      this.emitDiagnostic({ category: "media", state: "media_error", message: "A reproducao automatica do audio remoto foi bloqueada." })
    }
  }

  private attachRemoteAudio(session: any) {
    const peerConnection = session?.sessionDescriptionHandler?.peerConnection
    if (!peerConnection) return
    if (!this.remoteAudioStream) this.remoteAudioStream = new MediaStream()
    const audio = this.ensureAudio()
    if (!audio) return
    if (audio.srcObject !== this.remoteAudioStream) audio.srcObject = this.remoteAudioStream
    peerConnection.ontrack = (event: RTCTrackEvent) => {
      for (const track of event.streams.flatMap((stream) => stream.getAudioTracks())) {
        const exists = this.remoteAudioStream?.getAudioTracks().some((item) => item.id === track.id)
        if (!exists) this.remoteAudioStream?.addTrack(track)
      }
      if (event.track?.kind === "audio" && !this.remoteAudioStream?.getAudioTracks().some((item) => item.id === event.track.id)) {
        this.remoteAudioStream?.addTrack(event.track)
      }
      this.emitDiagnostic({ category: "media", state: "in_call", message: "Midia estabelecida." })
      void this.playRemoteAudio()
    }
  }

  private stopRemoteAudio() {
    this.remoteAudioElement?.pause()
    if (this.remoteAudioElement) this.remoteAudioElement.srcObject = null
    for (const track of this.remoteAudioStream?.getTracks() ?? []) track.stop()
    this.remoteAudioStream = null
  }

  private startRingtone() {
    if (typeof window === "undefined" || this.ringtoneInterval) return
    const context = this.ringtoneContext ?? new window.AudioContext()
    this.ringtoneContext = context
    const pulse = () => {
      const now = context.currentTime
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
      gain.connect(context.destination)
      const oscillator = context.createOscillator()
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(440, now)
      oscillator.frequency.setValueAtTime(554.37, now + 0.14)
      oscillator.connect(gain)
      oscillator.start(now)
      oscillator.stop(now + 0.3)
    }
    void context.resume().then(() => {
      pulse()
      this.ringtoneInterval = window.setInterval(pulse, 1500)
    }).catch(() => {
      this.emitDiagnostic({ category: "media", state: "media_error", message: "O toque local foi bloqueado ate uma interacao do usuario." })
    })
  }

  private stopRingtone() {
    if (this.ringtoneInterval) window.clearInterval(this.ringtoneInterval)
    this.ringtoneInterval = null
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private async prepareMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    for (const track of stream.getTracks()) track.stop()
  }

  private bindTransport() {
    const change = this.userAgent?.transport?.stateChange
    if (typeof change?.addListener !== "function") return
    change.addListener((state: any) => {
      const label = String(state).toLowerCase()
      if (label.includes("connected")) {
        this.emitConnection("wss_connected", "WSS conectado.", "unregistered")
        this.emitDiagnostic({ category: "transport", state: "wss_connected", message: "WSS conectado." })
      }
      if (label.includes("disconnected") && !this.manualDisconnect) {
        this.emitDiagnostic({ category: "transport", state: "transport_failed", message: "Transporte WSS desconectado." })
        this.scheduleReconnect("Transporte WSS desconectado.")
      }
    })
  }

  private scheduleReconnect(reason: string) {
    if (this.manualDisconnect || !this.activeProfile || this.reconnectTimer || this.session) return
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.emitConnection("transport_failed", "As tentativas automaticas de reconexao foram encerradas.", "failed")
      return
    }
    const delay = Math.min(30000, 1000 * 2 ** this.reconnectAttempts)
    this.reconnectAttempts += 1
    this.emitConnection("reconnecting", `Tentando reconectar em ${Math.round(delay / 1000)}s.`, "unregistered")
    this.emitDiagnostic({ category: "reconnection", state: "reconnecting", message: `${reason} Nova tentativa em ${Math.round(delay / 1000)}s.` })
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      if (!this.activeProfile || this.manualDisconnect) return
      void this.reconnect()
    }, delay)
  }

  private async reconnect() {
    if (!this.activeProfile || this.manualDisconnect) return
    await this.destroyRuntime(false)
    await this.initialize(this.activeProfile, this.callbacks ?? {
      onConnectionStateChange: () => undefined,
      onCallStateChange: () => undefined,
      onCallEnded: () => undefined,
      onDiagnosticEvent: () => undefined,
      onError: () => undefined
    })
  }

  private callIdOf(session: any) {
    return session?.request?.callId ?? session?.request?.message?.callId ?? session?.incomingInviteRequest?.message?.callId ?? session?.outgoingRequestMessage?.callId ?? session?.id ?? null
  }

  private remoteData(session: any) {
    const message = session?.request?.message ?? session?.incomingInviteRequest?.message ?? session?.outgoingRequestMessage ?? null
    const order = this.activeProfile?.remoteIdentityHeaderOrder?.length ? this.activeProfile.remoteIdentityHeaderOrder : DEFAULT_HEADERS
    const remoteIdentityDisplay = session?.remoteIdentity?.displayName ? String(session.remoteIdentity.displayName) : null
    const remoteIdentityUser = session?.remoteIdentity?.uri?.user ? String(session.remoteIdentity.uri.user) : null
    const remoteUri = typeof session?.remoteIdentity?.uri?.toString === "function" ? String(session.remoteIdentity.uri.toString()) : null
    const headersFound: string[] = []
    let remoteNumber = remoteIdentityUser || ""
    for (const name of order) {
      const value = headerValue(message, name)
      if (!value) continue
      headersFound.push(name)
      if (!remoteNumber) remoteNumber = numberFromText(value)
    }
    return {
      remoteNumber: remoteNumber || "Numero nao identificado",
      remoteName: remoteIdentityDisplay || (remoteNumber ? formatPhone(remoteNumber) : "Ligacao"),
      technical: { callId: this.callIdOf(session), remoteUri, remoteIdentityDisplay, remoteIdentityUser, remoteHeadersFound: headersFound }
    }
  }

  private updateSnapshot(session: any, direction: SoftphoneCallDirection, forceStatus?: SoftphoneCallStatus, endReason?: string | null) {
    const previous = this.sessionSnapshots.get(session)
    const remote = this.remoteData(session)
    const nextStatus = forceStatus ?? mapStatus(this.runtime, session?.state, direction)
    const startedAt = previous?.startedAt ?? nowIso()
    const snapshot: VoiceSoftphoneCallSnapshot = {
      callId: previous?.callId ?? this.callIdOf(session) ?? `${direction}-${Date.now()}`,
      direction,
      status: nextStatus,
      remoteNumber: remote.remoteNumber,
      remoteName: remote.remoteName,
      startedAt,
      ringingAt: previous?.ringingAt ?? (direction === "inbound" ? startedAt : null),
      answeredAt: previous?.answeredAt ?? (nextStatus === "in_call" ? nowIso() : null),
      endedAt: nextStatus === "idle" ? previous?.endedAt ?? nowIso() : previous?.endedAt ?? null,
      endReason: nextStatus === "idle" ? endReason ?? previous?.endReason ?? "Encerrada" : null,
      technical: remote.technical
    }
    this.sessionSnapshots.set(session, snapshot)
    return snapshot
  }

  private attachSession(session: any, direction: SoftphoneCallDirection) {
    this.session = session
    this.callbacks?.onCallStateChange(this.updateSnapshot(session, direction))
    if (direction === "inbound") {
      this.emitDiagnostic({ category: "call", state: "ringing", message: "INVITE recebido." })
    }
    session.stateChange?.addListener?.((state: any) => {
      const nextStatus = mapStatus(this.runtime, state, direction)
      if (nextStatus === "in_call") {
        this.stopRingtone()
        this.attachRemoteAudio(session)
        this.callbacks?.onCallStateChange(this.updateSnapshot(session, direction, "in_call"))
        this.emitDiagnostic({ category: "call", state: "in_call", message: "Chamada atendida." })
        return
      }
      if (nextStatus === "idle") {
        this.stopRingtone()
        this.stopRemoteAudio()
        const ended = this.updateSnapshot(session, direction, "idle", "Encerrada")
        this.session = null
        this.callbacks?.onCallEnded(ended)
        this.emitDiagnostic({ category: "call", state: "idle", message: "Chamada encerrada." })
        return
      }
      this.callbacks?.onCallStateChange(this.updateSnapshot(session, direction, nextStatus))
    })
  }

  async initialize(profile: SipConnectionProfile, callbacks: VoiceWebRtcCallbacks, options: InitializeOptions = {}) {
    this.callbacks = callbacks
    this.manualDisconnect = false
    const previousProfile = this.activeProfile
    if (typeof window === "undefined" || !navigator?.mediaDevices) {
      this.emitConnection("unsupported", "Este navegador nao suporta o softphone WebRTC.", "failed")
      return
    }
    const errors = validateSipConnectionProfile(profile)
    if (errors.length > 0) {
      const message = errors.join(" ")
      this.emitConnection("config_invalid", message, "failed")
      this.emitDiagnostic({ category: "configuration", state: "config_invalid", message: "Configuracao invalida." })
      this.emitError(message, "config_invalid")
      return
    }
    if (this.initPromise && sameProfile(this.activeProfile, profile)) return this.initPromise
    if (this.started && sameProfile(this.activeProfile, profile)) {
      this.emitConnection("registered", "Ramal registrado.", "registered")
      return
    }
    if (this.session && !sameProfile(this.activeProfile, profile)) {
      throw new Error("Nao e possivel trocar o provedor durante uma chamada ativa.")
    }
    this.clearReconnectTimer()
    this.emitConnection("validating", "Validando configuracao da conta SIP.", "unregistered")
    this.emitDiagnostic({ category: "configuration", state: "validating", message: "Configuracao validada." })
    if (options.requestMicrophone) {
      try {
        await this.prepareMicrophone()
      } catch (error) {
        const state = stateFromError(error)
        const message = error instanceof Error ? error.message : "Falha ao acessar o microfone."
        this.emitConnection(state, message, "failed")
        this.emitDiagnostic({ category: "media", state, message })
        this.emitError(message, state)
        throw error
      }
    }
    this.initPromise = (async () => {
      try {
        this.emitConnection("connecting_wss", "Tentativa de conexao WSS.", "unregistered")
        this.emitDiagnostic({ category: "transport", state: "connecting_wss", message: "Tentativa de conexao WSS." })
        this.runtime = this.runtime ?? ((await import("sip.js")) as SipJsRuntime)
        const uri = this.runtime.UserAgent.makeURI(buildSipUri(profile))
        if (!uri) throw new Error("URI SIP invalida para o softphone.")
        if (this.started && !sameProfile(previousProfile, profile)) await this.destroyRuntime(false)
        this.activeProfile = { ...profile }
        this.userAgent = new this.runtime.UserAgent({
          uri,
          authorizationUsername: profile.authorizationUsername,
          authorizationPassword: profile.password,
          displayName: profile.displayName,
          transportOptions: { server: profile.websocketUrl },
          delegate: {
            onInvite: async (invitation: any) => {
              if (this.session) {
                await invitation.reject?.({ statusCode: 486, reasonPhrase: "Busy Here" })
                this.emitDiagnostic({ category: "call", state: "ringing", message: "Nova chamada rejeitada por ocupado.", sipCode: 486 })
                return
              }
              this.attachSession(invitation, "inbound")
              this.startRingtone()
            }
          },
          sessionDescriptionHandlerFactoryOptions: {
            constraints: { audio: true, video: false },
            peerConnectionConfiguration: {
              iceServers: [
                ...(profile.stunServers.length ? profile.stunServers : [DEFAULT_STUN]).map((urls) => ({ urls })),
                ...profile.turnServers.map((urls) => ({ urls, username: profile.turnUsername || undefined, credential: profile.turnPassword || undefined }))
              ]
            }
          }
        })
        await this.userAgent.start()
        this.bindTransport()
        this.emitConnection("wss_connected", "WSS conectado.", "unregistered")
        this.emitDiagnostic({ category: "transport", state: "wss_connected", message: "WSS conectado." })
        this.registerer = new this.runtime.Registerer(this.userAgent, { expires: profile.registerExpires ?? 300 })
        this.emitConnection("registering", "Registrando ramal SIP.", "registering")
        this.emitDiagnostic({ category: "registration", state: "registering", message: "REGISTER enviado." })
        await this.registerer.register({
          requestDelegate: {
            onReject: (response: any) => {
              const sipCode = response?.message?.statusCode ?? response?.statusCode ?? null
              if (sipCode === 401) {
                this.emitDiagnostic({ category: "registration", state: "registering", message: "Desafio de autenticacao recebido.", sipCode: 401 })
              }
            }
          }
        })
        this.started = true
        this.reconnectAttempts = 0
        this.emitConnection("registered", "Ramal registrado.", "registered")
        this.emitDiagnostic({ category: "registration", state: "registered", message: "Ramal registrado." })
      } catch (error) {
        const sipCode = codeOf(error)
        const state = sipCode === 401 || sipCode === 403 ? "auth_failed" : stateFromError(error)
        const message = error instanceof Error ? error.message : "Nao foi possivel iniciar o cliente SIP.js."
        this.emitConnection(state, message, "failed")
        this.emitDiagnostic({ category: "error", state, message, sipCode })
        this.emitError(message, state, sipCode)
        throw error
      } finally {
        this.initPromise = null
      }
    })()
    return this.initPromise
  }

  async makeCall(number: string) {
    if (!this.runtime || !this.userAgent || !this.activeProfile) throw new Error("Softphone WebRTC ainda nao inicializado.")
    if (this.session) throw new Error("Ja existe uma chamada ativa nesta aba.")
    await this.prepareMicrophone()
    const normalized = number.replace(/[\s().-]/g, "")
    const dialTarget = `${this.activeProfile.dialPrefix ?? ""}${normalized}`
    const target = this.runtime.UserAgent.makeURI(`sip:${dialTarget}@${this.activeProfile.sipDomain}`)
    if (!target) throw new Error("Numero invalido para originacao SIP.")
    const inviter = new this.runtime.Inviter(this.userAgent, target, { sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } } })
    this.attachSession(inviter, "outbound")
    await inviter.invite()
  }

  async answerCall() {
    if (!this.session?.accept) return
    await this.prepareMicrophone()
    this.stopRingtone()
    await this.session.accept({ sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } } })
  }

  async rejectCall() {
    if (!this.session) return
    const session = this.session
    this.stopRingtone()
    if (session.reject) await session.reject()
    else if (session.dispose) session.dispose()
    this.callbacks?.onCallEnded(this.updateSnapshot(session, "inbound", "idle", "Recusada"))
    this.session = null
  }

  async hangup() {
    if (!this.session) return
    const session = this.session
    const direction = this.sessionSnapshots.get(session)?.direction ?? "outbound"
    this.stopRingtone()
    try {
      if (session.bye) await session.bye()
      else if (session.cancel) await session.cancel()
      else if (session.reject) await session.reject()
      else if (session.dispose) session.dispose()
    } finally {
      this.stopRemoteAudio()
      this.callbacks?.onCallEnded(this.updateSnapshot(session, direction, "idle", "Encerrada localmente"))
      this.session = null
    }
  }

  setMuted(muted: boolean) {
    const senders: RTCRtpSender[] = this.session?.sessionDescriptionHandler?.peerConnection?.getSenders?.() ?? []
    for (const sender of senders) {
      if (sender.track?.kind === "audio") sender.track.enabled = !muted
    }
  }

  async toggleHold() {
    throw new Error("Hold via re-INVITE sera conectado na proxima iteracao do softphone.")
  }

  getActiveProfile() {
    return this.activeProfile ? sanitizeSipConnectionProfile(this.activeProfile) : null
  }

  private async destroyRuntime(manualDisconnect: boolean) {
    this.manualDisconnect = manualDisconnect
    this.clearReconnectTimer()
    try {
      this.stopRingtone()
      this.stopRemoteAudio()
      await this.registerer?.unregister?.()
      await this.userAgent?.stop?.()
    } finally {
      this.userAgent = null
      this.registerer = null
      this.session = null
      this.sessionSnapshots.clear()
      this.started = false
    }
  }

  async destroy() {
    await this.destroyRuntime(true)
    this.activeProfile = null
    this.emitConnection("disconnected", "Softphone desconectado.", "unregistered")
  }
}

export const voiceWebRtcClient = new VoiceWebRtcClient()
