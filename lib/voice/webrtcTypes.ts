export type SoftphoneProviderMode = "axion" | "custom"
export type SoftphoneRuntimeMode = "mock" | "webrtc"

export type SoftphoneCallStatus =
  | "idle"
  | "dialing"
  | "ringing"
  | "in_call"
  | "on_hold"

export type SoftphoneCallDirection = "inbound" | "outbound"

export type SoftphoneConnectionState =
  | "disconnected"
  | "config_invalid"
  | "validating"
  | "connecting_wss"
  | "wss_connected"
  | "registering"
  | "registered"
  | "reconnecting"
  | "auth_failed"
  | "transport_failed"
  | "certificate_error"
  | "microphone_blocked"
  | "media_error"
  | "unsupported"

export type SoftphoneRegistrationState =
  | "unregistered"
  | "registering"
  | "registered"
  | "failed"

export type SoftphoneDiagnosticCategory =
  | "configuration"
  | "transport"
  | "registration"
  | "call"
  | "media"
  | "reconnection"
  | "error"

export type SipConnectionProfile = {
  id: string
  provider: SoftphoneProviderMode
  profileName: string
  websocketUrl: string
  sipDomain: string
  sipUsername: string
  authorizationUsername: string
  password: string
  displayName: string
  realm?: string | null
  sipUri?: string | null
  stunServers: string[]
  turnServers: string[]
  turnUsername?: string | null
  turnPassword?: string | null
  dialPrefix?: string | null
  registerExpires?: number | null
  remoteIdentityHeaderOrder: string[]
}

export type SanitizedSipConnectionProfile = Omit<
  SipConnectionProfile,
  "password" | "turnPassword"
>

export type VoiceSoftphoneTechnicalData = {
  callId: string | null
  remoteUri: string | null
  remoteIdentityDisplay: string | null
  remoteIdentityUser: string | null
  remoteHeadersFound: string[]
}

export type VoiceSoftphoneCallSnapshot = {
  callId: string
  direction: SoftphoneCallDirection
  status: SoftphoneCallStatus
  remoteNumber: string
  remoteName: string | null
  startedAt: string | null
  ringingAt: string | null
  answeredAt: string | null
  endedAt: string | null
  endReason: string | null
  technical: VoiceSoftphoneTechnicalData
}

export type VoiceSoftphoneDiagnosticEvent = {
  id: string
  timestamp: string
  category: SoftphoneDiagnosticCategory
  state: SoftphoneConnectionState | SoftphoneCallStatus
  message: string
  sipCode?: number | null
}

export type VoiceWebRtcConnectionUpdate = {
  connectionState: SoftphoneConnectionState
  registrationState: SoftphoneRegistrationState
  message: string
}

export type VoiceWebRtcCallbacks = {
  onConnectionStateChange: (update: VoiceWebRtcConnectionUpdate) => void
  onCallStateChange: (call: VoiceSoftphoneCallSnapshot) => void
  onCallEnded: (call: VoiceSoftphoneCallSnapshot) => void
  onDiagnosticEvent: (event: VoiceSoftphoneDiagnosticEvent) => void
  onError: (
    message: string,
    state?: SoftphoneConnectionState,
    sipCode?: number | null
  ) => void
}
