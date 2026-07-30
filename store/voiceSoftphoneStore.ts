"use client"

import { create } from "zustand"
import type {
  SanitizedSipConnectionProfile,
  SoftphoneCallDirection,
  SoftphoneCallStatus,
  SoftphoneConnectionState,
  SoftphoneProviderMode,
  SoftphoneRegistrationState,
  SoftphoneRuntimeMode,
  VoiceSoftphoneCallSnapshot,
  VoiceSoftphoneDiagnosticEvent
} from "@/lib/voice/webrtcTypes"

type SoftphoneClient = {
  id: string
  name: string
  phone: string
}

type StartCallInput = {
  callId: string
  clientName: string
  phone: string
  status?: SoftphoneCallStatus
  crmHref?: string | null
  direction?: SoftphoneCallDirection
  runtimeMode?: SoftphoneRuntimeMode
}

type ActiveCallDetails = VoiceSoftphoneCallSnapshot & {
  crmHref: string | null
}

type DiagnosticInput = Omit<VoiceSoftphoneDiagnosticEvent, "id" | "timestamp"> & {
  id?: string
  timestamp?: string
}

type VoiceSoftphoneState = {
  minimized: boolean
  muted: boolean
  status: SoftphoneCallStatus
  startedAt: string | null
  ringingAt: string | null
  answeredAt: string | null
  endedAt: string | null
  activeCallId: string | null
  currentCall: ActiveCallDetails | null
  client: SoftphoneClient | null
  openClientHref: string | null
  dialedNumber: string
  runtimeMode: SoftphoneRuntimeMode
  providerMode: SoftphoneProviderMode
  connectionState: SoftphoneConnectionState
  registrationState: SoftphoneRegistrationState
  connectionMessage: string
  errorMessage: string | null
  callDirection: SoftphoneCallDirection | null
  assignedAgentId: string | null
  assignedUserId: string | null
  assignedExtension: string | null
  sipUsername: string | null
  activeSipProfile: SanitizedSipConnectionProfile | null
  diagnostics: VoiceSoftphoneDiagnosticEvent[]
  toggleMinimized: () => void
  setMuted: (value: boolean) => void
  setStatus: (value: SoftphoneCallStatus) => void
  setDialedNumber: (value: string) => void
  appendDialDigit: (value: string) => void
  removeLastDialDigit: () => void
  clearDialedNumber: () => void
  setRuntimeMode: (value: SoftphoneRuntimeMode) => void
  setProviderMode: (value: SoftphoneProviderMode) => void
  setAgentIdentity: (input: {
    agentId: string
    userId: string | null
    extension: string
    sipUsername: string
  } | null) => void
  setConnectionState: (
    state: SoftphoneConnectionState,
    message?: string,
    registrationState?: SoftphoneRegistrationState
  ) => void
  setActiveSipProfile: (profile: SanitizedSipConnectionProfile | null) => void
  setErrorMessage: (message: string | null) => void
  addDiagnosticEvent: (event: DiagnosticInput) => void
  clearDiagnostics: () => void
  startMockCall: (input: StartCallInput) => void
  startWebRtcCallUi: (input: StartCallInput) => void
  syncCallSnapshot: (call: VoiceSoftphoneCallSnapshot, crmHref?: string | null) => void
  setIncomingCall: (input: StartCallInput) => void
  endCall: (call?: VoiceSoftphoneCallSnapshot | null) => void
}

function sanitizeDialedNumber(value: string) {
  return value.replace(/[^\d*#]/g, "")
}

function getConnectionMessage(
  state: SoftphoneConnectionState,
  fallback?: string
) {
  if (fallback) return fallback

  switch (state) {
    case "disconnected":
      return "Softphone desconectado."
    case "config_invalid":
      return "Revise os dados da conta SIP antes de conectar."
    case "validating":
      return "Validando configuracao do softphone."
    case "connecting_wss":
      return "Conectando ao WSS informado."
    case "wss_connected":
      return "WSS conectado. Preparando registro SIP."
    case "registering":
      return "Registrando ramal SIP."
    case "registered":
      return "Ramal registrado e pronto para chamadas."
    case "reconnecting":
      return "Tentando reconectar o softphone."
    case "auth_failed":
      return "Falha de autenticacao SIP."
    case "transport_failed":
      return "Falha de transporte WebSocket."
    case "certificate_error":
      return "A conexao WSS foi recusada pelo navegador."
    case "microphone_blocked":
      return "Permissao de microfone bloqueada."
    case "media_error":
      return "Sinalizacao pronta, mas houve falha na midia."
    case "unsupported":
      return "Este navegador nao suporta o softphone WebRTC."
    default:
      return "Softphone pronto para operacao."
  }
}

function buildCallState(input: StartCallInput) {
  const startedAt = new Date().toISOString()

  return {
    minimized: false,
    muted: false,
    status: input.status ?? "ringing",
    startedAt,
    ringingAt: input.direction === "inbound" ? startedAt : null,
    answeredAt: input.status === "in_call" ? startedAt : null,
    endedAt: null,
    activeCallId: input.callId,
    currentCall: {
      callId: input.callId,
      direction: input.direction ?? "outbound",
      status: input.status ?? "ringing",
      remoteNumber: input.phone,
      remoteName: input.clientName,
      startedAt,
      ringingAt: input.direction === "inbound" ? startedAt : null,
      answeredAt: input.status === "in_call" ? startedAt : null,
      endedAt: null,
      endReason: null,
      technical: {
        callId: input.callId,
        remoteUri: null,
        remoteIdentityDisplay: input.clientName,
        remoteIdentityUser: input.phone,
        remoteHeadersFound: []
      },
      crmHref: input.crmHref ?? null
    },
    client: {
      id: input.callId,
      name: input.clientName,
      phone: input.phone
    },
    openClientHref: input.crmHref ?? null,
    dialedNumber: sanitizeDialedNumber(input.phone),
    callDirection: input.direction ?? "outbound",
    runtimeMode: input.runtimeMode ?? "mock"
  }
}

export const useVoiceSoftphoneStore = create<VoiceSoftphoneState>((set) => ({
  minimized: false,
  muted: false,
  status: "idle",
  startedAt: null,
  ringingAt: null,
  answeredAt: null,
  endedAt: null,
  activeCallId: null,
  currentCall: null,
  client: null,
  openClientHref: null,
  dialedNumber: "",
  runtimeMode: "mock",
  providerMode: "axion",
  connectionState: "disconnected",
  registrationState: "unregistered",
  connectionMessage: "Softphone pronto para operacao.",
  errorMessage: null,
  callDirection: null,
  assignedAgentId: null,
  assignedUserId: null,
  assignedExtension: null,
  sipUsername: null,
  activeSipProfile: null,
  diagnostics: [],
  toggleMinimized: () => set((state) => ({ minimized: !state.minimized })),
  setMuted: (value) => set({ muted: value }),
  setStatus: (value) => set({ status: value }),
  setDialedNumber: (value) => set({ dialedNumber: sanitizeDialedNumber(value) }),
  appendDialDigit: (value) =>
    set((state) => ({
      dialedNumber: sanitizeDialedNumber(`${state.dialedNumber}${value}`)
    })),
  removeLastDialDigit: () =>
    set((state) => ({
      dialedNumber: state.dialedNumber.slice(0, -1)
    })),
  clearDialedNumber: () => set({ dialedNumber: "" }),
  setRuntimeMode: (value) => set({ runtimeMode: value }),
  setProviderMode: (value) => set({ providerMode: value }),
  setAgentIdentity: (input) =>
    set({
      assignedAgentId: input?.agentId ?? null,
      assignedUserId: input?.userId ?? null,
      assignedExtension: input?.extension ?? null,
      sipUsername: input?.sipUsername ?? null
    }),
  setConnectionState: (state, message, registrationState) =>
    set({
      connectionState: state,
      registrationState: registrationState ?? (state === "registered" ? "registered" : state === "registering" ? "registering" : state === "auth_failed" || state === "config_invalid" || state === "transport_failed" || state === "certificate_error" ? "failed" : "unregistered"),
      connectionMessage: getConnectionMessage(state, message)
    }),
  setActiveSipProfile: (profile) => set({ activeSipProfile: profile }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  addDiagnosticEvent: (event) =>
    set((state) => ({
      diagnostics: [
        ...state.diagnostics.slice(-99),
        {
          id: event.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: event.timestamp ?? new Date().toISOString(),
          category: event.category,
          state: event.state,
          message: event.message,
          sipCode: event.sipCode ?? null
        }
      ]
    })),
  clearDiagnostics: () => set({ diagnostics: [] }),
  startMockCall: (input) =>
    set({
      ...buildCallState({
        ...input,
        runtimeMode: "mock"
      }),
      errorMessage: null
    }),
  startWebRtcCallUi: (input) =>
    set({
      ...buildCallState({
        ...input,
        runtimeMode: "webrtc"
      }),
      errorMessage: null
    }),
  syncCallSnapshot: (call, crmHref) =>
    set((state) => ({
      minimized: false,
      muted: state.muted,
      status: call.status,
      startedAt: state.startedAt ?? call.startedAt,
      ringingAt: state.ringingAt ?? call.ringingAt,
      answeredAt: state.answeredAt ?? call.answeredAt,
      endedAt: call.endedAt ?? state.endedAt,
      activeCallId: call.callId,
      currentCall: {
        ...call,
        crmHref: crmHref ?? state.currentCall?.crmHref ?? null
      },
      client: {
        id: call.callId,
        name: call.remoteName || "Ligacao",
        phone: call.remoteNumber
      },
      openClientHref: crmHref ?? state.currentCall?.crmHref ?? null,
      callDirection: call.direction
    })),
  setIncomingCall: (input) =>
    set({
      ...buildCallState({
        ...input,
        status: input.status ?? "ringing",
        direction: "inbound",
        runtimeMode: "webrtc"
      }),
      errorMessage: null
    }),
  endCall: (call) =>
    set((state) => ({
      status: "idle",
      startedAt: state.startedAt,
      ringingAt: state.ringingAt,
      answeredAt: state.answeredAt,
      endedAt: call?.endedAt ?? new Date().toISOString(),
      activeCallId: null,
      currentCall: call
        ? {
            ...call,
            crmHref: state.currentCall?.crmHref ?? null
          }
        : null,
      client: null,
      muted: false,
      openClientHref: null,
      callDirection: null,
      errorMessage: null
    }))
}))

export type {
  ActiveCallDetails,
  DiagnosticInput,
  SoftphoneClient,
  StartCallInput,
  VoiceSoftphoneState
}
