"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  deriveSoftphoneIdentity,
  useCurrentVoiceAgent,
  useVoiceData,
  useVoiceProvisionDirectory
} from "@/lib/voice/api"
import {
  getVoiceWebRtcConfigFromEnv,
  sanitizeSipConnectionProfile,
  voiceWebRtcClient
} from "@/lib/voice/webrtcClient"
import type { SipConnectionProfile, VoiceWebRtcCallbacks } from "@/lib/voice/webrtcTypes"
import { useAuth } from "@/store/authStore"
import { useVoiceSoftphoneStore } from "@/store/voiceSoftphoneStore"

function buildSoftphoneCallbacks(): VoiceWebRtcCallbacks {
  return {
    onConnectionStateChange: ({ connectionState, message, registrationState }) => {
      const store = useVoiceSoftphoneStore.getState()
      store.setConnectionState(connectionState, message, registrationState)
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
      if (state) {
        store.setConnectionState(state, message)
      }
      store.addDiagnosticEvent({
        category: "error",
        state: state ?? "transport_failed",
        message,
        sipCode: sipCode ?? null
      })
    }
  }
}

export default function VoiceSoftphoneBootstrap() {
  const { user } = useAuth()
  const providerMode = useVoiceSoftphoneStore((state) => state.providerMode)
  const { agents: apiAgents } = useVoiceData()
  const { agents: directoryAgents } = useVoiceProvisionDirectory()
  const agents = directoryAgents.length > 0 ? directoryAgents : apiAgents
  const currentAgent = useCurrentVoiceAgent(agents, user?.id)
  const previousUserIdRef = useRef<string | null>(null)
  const lastAxionProfileKeyRef = useRef<string | null>(null)

  const axionProfile = useMemo(() => {
    const envConfig = getVoiceWebRtcConfigFromEnv()
    const identity = deriveSoftphoneIdentity(currentAgent)
    const useStaticSipCredentials =
      process.env.NEXT_PUBLIC_AXION_VOICE_SIP_USE_STATIC_CREDENTIALS === "true"

    if (!envConfig.enabled) {
      return {
        runtimeMode: "mock" as const,
        profile: null,
        identity: null
      }
    }

    if (!identity && !useStaticSipCredentials) {
      return {
        runtimeMode: "webrtc" as const,
        profile: null,
        identity: null
      }
    }

    const resolvedSipUsername = useStaticSipCredentials
      ? envConfig.username || identity?.sipUsername || ""
      : identity?.sipUsername || ""
    const resolvedSipPassword = useStaticSipCredentials
      ? envConfig.password || identity?.sipPassword || ""
      : identity?.sipPassword || ""
    const resolvedDisplayName = identity?.displayName || envConfig.displayName || "Axion Voice"

    if (!resolvedSipUsername || !resolvedSipPassword || !envConfig.websocketUrl || !envConfig.sipDomain) {
      return {
        runtimeMode: "webrtc" as const,
        profile: null,
        identity: identity ? { ...identity, sipUsername: resolvedSipUsername } : null
      }
    }

    const profile: SipConnectionProfile = {
      id: `axion-${identity?.agentId ?? "static"}`,
      provider: "axion",
      profileName: "Axion Voice",
      websocketUrl: envConfig.websocketUrl,
      sipDomain: envConfig.sipDomain,
      sipUsername: resolvedSipUsername,
      authorizationUsername: resolvedSipUsername,
      password: resolvedSipPassword,
      displayName: resolvedDisplayName,
      realm: null,
      sipUri: null,
      stunServers: envConfig.stunServers,
      turnServers: [],
      turnUsername: null,
      turnPassword: null,
      dialPrefix: null,
      registerExpires: 300,
      remoteIdentityHeaderOrder: ["P-Asserted-Identity", "Remote-Party-ID", "From"]
    }

    return {
      runtimeMode: "webrtc" as const,
      profile,
      identity: identity
        ? { ...identity, sipUsername: resolvedSipUsername }
        : null
    }
  }, [currentAgent])

  useEffect(() => {
    return () => {
      void voiceWebRtcClient.destroy()
    }
  }, [])

  useEffect(() => {
    const previousUserId = previousUserIdRef.current
    previousUserIdRef.current = user?.id ?? null

    if (previousUserId && previousUserId !== (user?.id ?? null)) {
      const store = useVoiceSoftphoneStore.getState()
      store.setErrorMessage(null)
      store.setActiveSipProfile(null)
      void voiceWebRtcClient.destroy()
    }
  }, [user?.id])

  useEffect(() => {
    const store = useVoiceSoftphoneStore.getState()
    store.setRuntimeMode(axionProfile.runtimeMode)
    store.setAgentIdentity(
      axionProfile.identity
        ? {
            agentId: axionProfile.identity.agentId,
            userId: axionProfile.identity.userId,
            extension: axionProfile.identity.extension,
            sipUsername: axionProfile.identity.sipUsername
          }
        : null
    )

    if (providerMode !== "axion") {
      return
    }

    if (axionProfile.runtimeMode === "mock") {
      store.setConnectionState("disconnected", "Modo demonstrativo ativo para o softphone Axion.")
      store.setActiveSipProfile(null)
      return
    }

    if (!axionProfile.profile) {
      store.setConnectionState(
        "config_invalid",
        "O ramal Axion deste usuario ainda nao possui credenciais suficientes para registrar."
      )
      store.setActiveSipProfile(null)
      return
    }

    const profileKey = JSON.stringify(sanitizeSipConnectionProfile(axionProfile.profile))
    if (lastAxionProfileKeyRef.current === profileKey) {
      return
    }

    lastAxionProfileKeyRef.current = profileKey
    store.setActiveSipProfile(sanitizeSipConnectionProfile(axionProfile.profile))
    void voiceWebRtcClient.initialize(axionProfile.profile, buildSoftphoneCallbacks())
  }, [axionProfile, providerMode])

  return null
}
