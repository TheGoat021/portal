"use client"

import { create } from "zustand"

export type SoftphoneCallStatus =
  | "idle"
  | "dialing"
  | "ringing"
  | "in_call"
  | "on_hold"

export type SoftphoneConnectionStatus =
  | "idle"
  | "connecting"
  | "registered"
  | "error"
  | "unsupported"

export type SoftphoneRuntimeMode = "mock" | "webrtc"
export type SoftphoneCallDirection = "inbound" | "outbound"

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

type VoiceSoftphoneState = {
  minimized: boolean
  muted: boolean
  status: SoftphoneCallStatus
  startedAt: string | null
  activeCallId: string | null
  client: SoftphoneClient | null
  openClientHref: string | null
  dialedNumber: string
  runtimeMode: SoftphoneRuntimeMode
  connectionStatus: SoftphoneConnectionStatus
  connectionMessage: string
  errorMessage: string | null
  callDirection: SoftphoneCallDirection | null
  assignedAgentId: string | null
  assignedUserId: string | null
  assignedExtension: string | null
  sipUsername: string | null
  toggleMinimized: () => void
  setMuted: (value: boolean) => void
  setStatus: (value: SoftphoneCallStatus) => void
  setDialedNumber: (value: string) => void
  appendDialDigit: (value: string) => void
  removeLastDialDigit: () => void
  clearDialedNumber: () => void
  setRuntimeMode: (value: SoftphoneRuntimeMode) => void
  setAgentIdentity: (input: {
    agentId: string
    userId: string | null
    extension: string
    sipUsername: string
  } | null) => void
  setConnectionState: (status: SoftphoneConnectionStatus, message?: string) => void
  setErrorMessage: (message: string | null) => void
  startMockCall: (input: StartCallInput) => void
  startWebRtcCallUi: (input: StartCallInput) => void
  updateActiveCallStatus: (value: SoftphoneCallStatus) => void
  setIncomingCall: (input: StartCallInput) => void
  endCall: () => void
}

function sanitizeDialedNumber(value: string) {
  return value.replace(/[^\d*#]/g, "")
}

function buildCallState(input: StartCallInput) {
  return {
    minimized: false,
    muted: false,
    status: input.status ?? "ringing",
    startedAt: new Date().toISOString(),
    activeCallId: input.callId,
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
  activeCallId: null,
  client: null,
  openClientHref: null,
  dialedNumber: "",
  runtimeMode: "mock",
  connectionStatus: "idle",
  connectionMessage: "Softphone pronto para operacao.",
  errorMessage: null,
  callDirection: null,
  assignedAgentId: null,
  assignedUserId: null,
  assignedExtension: null,
  sipUsername: null,
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
  setAgentIdentity: (input) =>
    set({
      assignedAgentId: input?.agentId ?? null,
      assignedUserId: input?.userId ?? null,
      assignedExtension: input?.extension ?? null,
      sipUsername: input?.sipUsername ?? null
    }),
  setConnectionState: (status, message) =>
    set({
      connectionStatus: status,
      connectionMessage:
        message ??
        (status === "registered"
          ? "Softphone conectado ao Asterisk."
          : status === "connecting"
            ? "Conectando ao Asterisk..."
            : status === "unsupported"
              ? "Navegador ou biblioteca sem suporte para WebRTC."
              : status === "error"
                ? "Falha ao conectar o softphone."
                : "Softphone pronto para operacao.")
    }),
  setErrorMessage: (message) => set({ errorMessage: message }),
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
  updateActiveCallStatus: (value) => set({ status: value }),
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
  endCall: () =>
    set({
      status: "idle",
      startedAt: null,
      activeCallId: null,
      client: null,
      muted: false,
      openClientHref: null,
      callDirection: null,
      errorMessage: null
    })
}))
