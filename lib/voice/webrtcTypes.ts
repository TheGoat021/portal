import type {
  SoftphoneCallDirection,
  SoftphoneCallStatus,
  SoftphoneConnectionStatus
} from "@/store/voiceSoftphoneStore"

export type VoiceWebRtcConfig = {
  enabled: boolean
  websocketUrl: string
  sipDomain: string
  username: string
  password: string
  displayName: string
  stunServers: string[]
}

export type VoiceWebRtcIncomingCall = {
  callId: string
  clientName: string
  phone: string
  crmHref?: string | null
}

export type VoiceWebRtcCallSnapshot = VoiceWebRtcIncomingCall & {
  status: SoftphoneCallStatus
  direction: SoftphoneCallDirection
}

export type VoiceWebRtcCallbacks = {
  onRegistrationStateChange: (
    status: SoftphoneConnectionStatus,
    message?: string
  ) => void
  onIncomingCall: (call: VoiceWebRtcIncomingCall) => void
  onCallStateChange: (call: VoiceWebRtcCallSnapshot) => void
  onCallEnded: () => void
  onError: (message: string) => void
}
