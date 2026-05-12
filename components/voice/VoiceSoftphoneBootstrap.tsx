"use client"

import { useEffect } from "react"
import {
  deriveSoftphoneIdentity,
  useCurrentVoiceAgent,
  useVoiceData,
  useVoiceProvisionDirectory
} from "@/lib/voice/api"
import {
  getVoiceWebRtcConfigFromEnv,
  voiceWebRtcClient
} from "@/lib/voice/webrtcClient"
import { useAuth } from "@/store/authStore"
import { useVoiceSoftphoneStore } from "@/store/voiceSoftphoneStore"

export default function VoiceSoftphoneBootstrap() {
  const { user } = useAuth()
  const { agents: apiAgents } = useVoiceData()
  const { agents: directoryAgents } = useVoiceProvisionDirectory()
  const agents = directoryAgents.length > 0 ? directoryAgents : apiAgents
  const currentAgent = useCurrentVoiceAgent(agents, user?.id)

  useEffect(() => {
    const store = useVoiceSoftphoneStore.getState()
    const baseConfig = getVoiceWebRtcConfigFromEnv()
    const identity = deriveSoftphoneIdentity(currentAgent)
    const useStaticSipCredentials =
      process.env.NEXT_PUBLIC_AXION_VOICE_SIP_USE_STATIC_CREDENTIALS === "true"
    store.setRuntimeMode(baseConfig.enabled ? "webrtc" : "mock")

    if (!identity && !useStaticSipCredentials) {
      store.setAgentIdentity(null)
      store.setConnectionState(
        "idle",
        "Este usuario ainda nao possui um ramal configurado no Axion Voice."
      )
      return
    }

    const resolvedSipUsername = useStaticSipCredentials
      ? baseConfig.username || identity?.sipUsername || ""
      : identity?.sipUsername || ""
    const resolvedSipPassword = useStaticSipCredentials
      ? baseConfig.password || identity?.sipPassword || ""
      : identity?.sipPassword || ""
    const resolvedDisplayName =
      identity?.displayName || baseConfig.displayName || "Axion Voice"

    if (!resolvedSipUsername || !resolvedSipPassword) {
      store.setAgentIdentity(identity ? { ...identity, sipUsername: identity.sipUsername } : null)
      store.setConnectionState(
        "error",
        useStaticSipCredentials
          ? "As credenciais SIP estaticas estao incompletas no ambiente."
          : "O ramal deste usuario ainda nao possui credenciais suficientes para registrar no softphone."
      )
      return
    }

    if (identity) {
      store.setAgentIdentity({
        ...identity,
        sipUsername: resolvedSipUsername
      })
    } else {
      store.setAgentIdentity(null)
    }

    const config = {
      ...baseConfig,
      username: resolvedSipUsername,
      password: resolvedSipPassword,
      displayName: resolvedDisplayName
    }

    void voiceWebRtcClient.initialize(config, {
      onRegistrationStateChange: (status, message) => {
        const currentStore = useVoiceSoftphoneStore.getState()
        currentStore.setConnectionState(status, message)
      },
      onIncomingCall: (call) => {
        const currentStore = useVoiceSoftphoneStore.getState()
        currentStore.setIncomingCall({
          callId: call.callId,
          clientName: call.clientName,
          phone: call.phone,
          crmHref: call.crmHref ?? null
        })
      },
      onCallStateChange: (call) => {
        const currentStore = useVoiceSoftphoneStore.getState()
        currentStore.startWebRtcCallUi({
          callId: call.callId,
          clientName: call.clientName,
          phone: call.phone,
          status: call.status,
          direction: call.direction,
          runtimeMode: "webrtc"
        })
      },
      onCallEnded: () => {
        const currentStore = useVoiceSoftphoneStore.getState()
        currentStore.endCall()
      },
      onError: (message) => {
        const currentStore = useVoiceSoftphoneStore.getState()
        currentStore.setErrorMessage(message)
      }
    })

    return () => {
      void voiceWebRtcClient.destroy()
    }
  }, [
    currentAgent?.id,
    currentAgent?.user_id,
    currentAgent?.extension,
    currentAgent?.name,
    currentAgent?.email,
    user?.id
  ])

  return null
}
