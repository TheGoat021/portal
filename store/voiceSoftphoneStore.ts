"use client"

import { create } from "zustand"

type SoftphoneCallStatus = "idle" | "dialing" | "ringing" | "in_call" | "on_hold"

type SoftphoneClient = {
  id: string
  name: string
  phone: string
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
  toggleMinimized: () => void
  setMuted: (value: boolean) => void
  setStatus: (value: SoftphoneCallStatus) => void
  setDialedNumber: (value: string) => void
  appendDialDigit: (value: string) => void
  removeLastDialDigit: () => void
  clearDialedNumber: () => void
  startMockCall: (input: {
    callId: string
    clientName: string
    phone: string
    status?: SoftphoneCallStatus
    crmHref?: string | null
  }) => void
  endCall: () => void
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
  toggleMinimized: () => set((state) => ({ minimized: !state.minimized })),
  setMuted: (value) => set({ muted: value }),
  setStatus: (value) => set({ status: value }),
  setDialedNumber: (value) => set({ dialedNumber: value.replace(/[^\d*#]/g, "") }),
  appendDialDigit: (value) =>
    set((state) => ({
      dialedNumber: `${state.dialedNumber}${value}`.replace(/[^\d*#]/g, "")
    })),
  removeLastDialDigit: () =>
    set((state) => ({
      dialedNumber: state.dialedNumber.slice(0, -1)
    })),
  clearDialedNumber: () => set({ dialedNumber: "" }),
  startMockCall: (input) =>
    set({
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
      dialedNumber: input.phone.replace(/[^\d*#]/g, "")
    }),
  endCall: () =>
    set({
      status: "idle",
      startedAt: null,
      activeCallId: null,
      client: null,
      muted: false,
      openClientHref: null
    })
}))
