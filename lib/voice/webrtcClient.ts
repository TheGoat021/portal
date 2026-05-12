"use client"

import { formatPhone } from "@/lib/voice/api"
import type {
  VoiceWebRtcCallbacks,
  VoiceWebRtcCallSnapshot,
  VoiceWebRtcConfig,
  VoiceWebRtcIncomingCall
} from "@/lib/voice/webrtcTypes"

type SipJsRuntime = {
  Inviter: any
  Registerer: any
  SessionState: any
  UserAgent: any
}

function mapSessionStatus(
  runtime: SipJsRuntime | null,
  sessionState: any,
  direction: "inbound" | "outbound"
) {
  if (!runtime) return direction === "outbound" ? "dialing" : "ringing"

  switch (sessionState) {
    case runtime.SessionState.Initial:
      return direction === "outbound" ? "dialing" : "ringing"
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

function getRemotePartyLabel(session: any) {
  const displayName = session?.remoteIdentity?.displayName
  const user = session?.remoteIdentity?.uri?.user
  const phone = user ? String(user) : ""

  return {
    clientName: displayName || formatPhone(phone) || "Ligacao Axion",
    phone
  }
}

export function getVoiceWebRtcConfigFromEnv(): VoiceWebRtcConfig {
  const stunServersRaw = process.env.NEXT_PUBLIC_AXION_VOICE_STUN_SERVERS ?? ""
  const stunServers = stunServersRaw
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
  private remoteAudioElement: HTMLAudioElement | null = null
  private remoteAudioStream: MediaStream | null = null
  private ringtoneContext: AudioContext | null = null
  private ringtoneInterval: number | null = null

  private ensureRemoteAudioElement() {
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
    const audio = this.ensureRemoteAudioElement()
    if (!audio) return

    try {
      await audio.play()
    } catch {
      // Browsers may require an explicit user gesture before unmuted playback.
    }
  }

  private attachRemoteAudio(session: any) {
    const handler = session?.sessionDescriptionHandler
    const peerConnection = handler?.peerConnection
    if (!peerConnection) return

    if (!this.remoteAudioStream) {
      this.remoteAudioStream = new MediaStream()
    }

    const audio = this.ensureRemoteAudioElement()
    if (!audio) return

    if (audio.srcObject !== this.remoteAudioStream) {
      audio.srcObject = this.remoteAudioStream
    }

    const syncRemoteTracks = () => {
      const receivers: RTCRtpReceiver[] = peerConnection.getReceivers?.() ?? []
      for (const receiver of receivers) {
        const track = receiver.track
        if (!track || track.kind !== "audio") continue

        const alreadyAttached = this.remoteAudioStream
          ?.getAudioTracks()
          .some((existingTrack) => existingTrack.id === track.id)

        if (!alreadyAttached) {
          this.remoteAudioStream?.addTrack(track)
        }
      }

      void this.playRemoteAudio()
    }

    peerConnection.ontrack = (event: RTCTrackEvent) => {
      for (const track of event.streams.flatMap((stream) => stream.getAudioTracks())) {
        const alreadyAttached = this.remoteAudioStream
          ?.getAudioTracks()
          .some((existingTrack) => existingTrack.id === track.id)

        if (!alreadyAttached) {
          this.remoteAudioStream?.addTrack(track)
        }
      }

      if (
        event.track?.kind === "audio" &&
        !this.remoteAudioStream?.getAudioTracks().some((track) => track.id === event.track.id)
      ) {
        this.remoteAudioStream?.addTrack(event.track)
      }

      void this.playRemoteAudio()
    }

    syncRemoteTracks()
  }

  private stopRemoteAudio() {
    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause()
      this.remoteAudioElement.srcObject = null
    }

    for (const track of this.remoteAudioStream?.getTracks() ?? []) {
      track.stop()
    }

    this.remoteAudioStream = null
  }

  private startRingtone() {
    if (typeof window === "undefined" || this.ringtoneInterval) return

    const audioContext =
      this.ringtoneContext ??
      new window.AudioContext()
    this.ringtoneContext = audioContext

    const playPulse = () => {
      const now = audioContext.currentTime
      const gain = audioContext.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
      gain.connect(audioContext.destination)

      const oscillator = audioContext.createOscillator()
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(440, now)
      oscillator.frequency.setValueAtTime(554.37, now + 0.14)
      oscillator.connect(gain)
      oscillator.start(now)
      oscillator.stop(now + 0.3)
    }

    void audioContext.resume().then(() => {
      playPulse()
      this.ringtoneInterval = window.setInterval(playPulse, 1500)
    }).catch(() => {
      // Some browsers block auto-played ringtone audio before user interaction.
    })
  }

  private stopRingtone() {
    if (this.ringtoneInterval) {
      window.clearInterval(this.ringtoneInterval)
      this.ringtoneInterval = null
    }
  }

  async initialize(config: VoiceWebRtcConfig, callbacks: VoiceWebRtcCallbacks) {
    this.callbacks = callbacks

    if (!config.enabled) {
      callbacks.onRegistrationStateChange(
        "idle",
        "WebRTC pronto para configuracao. Ative as variaveis publicas para registrar no Asterisk."
      )
      return
    }

    if (typeof window === "undefined" || !navigator?.mediaDevices) {
      callbacks.onRegistrationStateChange(
        "unsupported",
        "Este navegador nao oferece a camada minima de WebRTC para o softphone."
      )
      return
    }

    const requiredValues = [
      config.websocketUrl,
      config.sipDomain,
      config.username,
      config.password
    ]

    if (requiredValues.some((value) => !value)) {
      callbacks.onRegistrationStateChange(
        "error",
        "Configure WSS, dominio SIP, usuario e senha do Axion Voice no ambiente publico."
      )
      return
    }

    if (this.started) {
      callbacks.onRegistrationStateChange("registered", "Softphone Axion conectado.")
      return
    }

    callbacks.onRegistrationStateChange("connecting", "Conectando ao Asterisk via WebRTC...")

    try {
      this.runtime = (await import("sip.js")) as SipJsRuntime

      const uri = this.runtime.UserAgent.makeURI(`sip:${config.username}@${config.sipDomain}`)
      if (!uri) {
        throw new Error("URI SIP invalida para o softphone.")
      }

      this.userAgent = new this.runtime.UserAgent({
        uri,
        authorizationUsername: config.username,
        authorizationPassword: config.password,
        displayName: config.displayName,
        transportOptions: {
          server: config.websocketUrl
        },
        delegate: {
          onInvite: (invitation: any) => {
            this.attachSession(invitation, "inbound")
            this.startRingtone()

            const remote = getRemotePartyLabel(invitation)
            const incomingCall: VoiceWebRtcIncomingCall = {
              callId: `inbound-${Date.now()}`,
              clientName: remote.clientName,
              phone: remote.phone || "Numero nao identificado"
            }

            callbacks.onIncomingCall(incomingCall)
          }
        },
        sessionDescriptionHandlerFactoryOptions: {
          constraints: {
            audio: true,
            video: false
          },
          peerConnectionConfiguration: {
            iceServers: (config.stunServers.length
              ? config.stunServers
              : ["stun:stun.l.google.com:19302"]
            ).map((urls) => ({ urls }))
          }
        }
      })

      await this.userAgent.start()
      this.registerer = new this.runtime.Registerer(this.userAgent)
      await this.registerer.register()
      this.started = true

      callbacks.onRegistrationStateChange("registered", "Softphone Axion conectado.")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel iniciar o cliente SIP.js."

      callbacks.onRegistrationStateChange("error", message)
      callbacks.onError(message)
    }
  }

  private emitCallSnapshot(session: any, direction: "inbound" | "outbound") {
    if (!this.callbacks) return

    const remote = getRemotePartyLabel(session)
    const snapshot: VoiceWebRtcCallSnapshot = {
      callId: session?.id || `${direction}-${Date.now()}`,
      clientName: remote.clientName,
      phone: remote.phone || "Numero nao identificado",
      direction,
      status: mapSessionStatus(this.runtime, session?.state, direction)
    }

    this.callbacks.onCallStateChange(snapshot)
  }

  private attachSession(session: any, direction: "inbound" | "outbound") {
    this.session = session
    this.attachRemoteAudio(session)
    this.emitCallSnapshot(session, direction)

    session.stateChange?.addListener?.((state: any) => {
      const nextStatus = mapSessionStatus(this.runtime, state, direction)

      if (nextStatus === "in_call") {
        this.stopRingtone()
        this.attachRemoteAudio(session)
      }

      if (nextStatus === "idle") {
        this.stopRingtone()
        this.stopRemoteAudio()
        this.session = null
        this.callbacks?.onCallEnded()
        return
      }

      this.emitCallSnapshot(session, direction)
    })
  }

  async makeCall(number: string) {
    if (!this.runtime || !this.userAgent) {
      throw new Error("Softphone WebRTC ainda nao inicializado.")
    }

    const target = this.runtime.UserAgent.makeURI(`sip:${number}@${getVoiceWebRtcConfigFromEnv().sipDomain}`)
    if (!target) {
      throw new Error("Numero invalido para originacao SIP.")
    }

    const inviter = new this.runtime.Inviter(this.userAgent, target, {
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: false
        }
      }
    })

    this.attachSession(inviter, "outbound")
    await inviter.invite()
  }

  async answerCall() {
    if (!this.session?.accept) return
    this.stopRingtone()
    await this.session.accept({
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: false
        }
      }
    })
  }

  async rejectCall() {
    if (!this.session) return
    this.stopRingtone()

    if (this.session.reject) {
      await this.session.reject()
    } else if (this.session.dispose) {
      this.session.dispose()
    }
  }

  async hangup() {
    if (!this.session) return
    this.stopRingtone()

    try {
      if (this.session.bye) {
        await this.session.bye()
      } else if (this.session.cancel) {
        await this.session.cancel()
      } else if (this.session.reject) {
        await this.session.reject()
      } else if (this.session.dispose) {
        this.session.dispose()
      }
    } finally {
      this.stopRemoteAudio()
      this.session = null
    }
  }

  setMuted(muted: boolean) {
    const handler = this.session?.sessionDescriptionHandler
    const peerConnection = handler?.peerConnection
    const senders: RTCRtpSender[] = peerConnection?.getSenders?.() ?? []

    for (const sender of senders) {
      if (sender.track?.kind === "audio") {
        sender.track.enabled = !muted
      }
    }
  }

  async toggleHold() {
    throw new Error("Hold via re-INVITE sera conectado na proxima iteracao do softphone.")
  }

  async destroy() {
    try {
      this.stopRingtone()
      this.stopRemoteAudio()
      await this.registerer?.unregister?.()
      await this.userAgent?.stop?.()
    } finally {
      this.runtime = null
      this.userAgent = null
      this.registerer = null
      this.session = null
      this.started = false
    }
  }
}

export const voiceWebRtcClient = new VoiceWebRtcClient()
