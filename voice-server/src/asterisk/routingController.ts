import { ariClient } from "./ariClient.js"
import { env } from "../env.js"
import { logger } from "../utils/logger.js"
import {
  createCallEvent,
  createInboundCall,
  finalizeCall,
  findCallByExternalId,
  findCallByUniqueId,
  setCallAnswered,
  setCallQueued
} from "../services/callService.js"
import { resolveQueueForInboundNumber, selectEligibleAgents } from "../services/routingService.js"
import { updateAgentStatus } from "../services/agentService.js"

type AriEvent = Record<string, any>

type RoutedChannel = {
  channelId: string
  agentId: string
}

type InboundSession = {
  sessionId: string
  inboundChannelId: string
  callId: string
  queueId: string | null
  bridgeId: string | null
  answered: boolean
  ringingAgents: RoutedChannel[]
  timeout: NodeJS.Timeout | null
}

const sessionsByInboundChannel = new Map<string, InboundSession>()
const sessionsByAgentChannel = new Map<string, InboundSession>()

function deriveSessionId(channelId: string) {
  return `session:${channelId}`
}

function buildAgentEndpoint(extension: string) {
  return `PJSIP/${extension}${env.asterisk.agentEndpointSuffix}`
}

async function setAgentAvailable(agentId: string) {
  try {
    await updateAgentStatus(agentId, "available", null)
  } catch (error) {
    logger.warn("Failed to set agent back to available", {
      agentId,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

async function resolveExistingCall(payload: {
  uniqueId?: string | null
  channelId?: string | null
}) {
  const byUniqueId = await findCallByUniqueId(payload.uniqueId ?? null)
  if (byUniqueId?.id) return byUniqueId
  return findCallByExternalId(payload.channelId ?? null)
}

async function cleanupSession(session: InboundSession) {
  if (session.timeout) {
    clearTimeout(session.timeout)
  }

  for (const ringingChannel of session.ringingAgents) {
    sessionsByAgentChannel.delete(ringingChannel.channelId)
  }

  sessionsByInboundChannel.delete(session.inboundChannelId)

  if (session.bridgeId) {
    try {
      await ariClient.destroyBridge(session.bridgeId)
    } catch (error) {
      logger.warn("Failed to destroy ARI bridge during cleanup", {
        bridgeId: session.bridgeId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

async function failInboundCall(
  session: InboundSession,
  reason: "failed" | "abandoned" | "ended"
) {
  for (const ringingChannel of session.ringingAgents) {
    try {
      await ariClient.hangupChannel(ringingChannel.channelId)
    } catch {
      // ignore cleanup errors
    }

    await setAgentAvailable(ringingChannel.agentId)
  }

  await finalizeCall(session.callId, reason)
  await cleanupSession(session)
}

async function startRingForQueue(payload: {
  inboundChannelId: string
  callId: string
  queueId: string
  callerNumber: string
  maxWaitSeconds: number
  targets: Array<{
    agent_id: string
    agent: {
      extension: string
      name: string
    } | null
  }>
}) {
  const bridge = await ariClient.createBridge("mixing")
  const bridgeId = String(bridge?.id || "")

  if (!bridgeId) {
    throw new Error("ARI did not return a bridge id for inbound routing.")
  }

  await ariClient.answerChannel(payload.inboundChannelId)
  await ariClient.addChannelToBridge(bridgeId, payload.inboundChannelId)

  const session: InboundSession = {
    sessionId: deriveSessionId(payload.inboundChannelId),
    inboundChannelId: payload.inboundChannelId,
    callId: payload.callId,
    queueId: payload.queueId,
    bridgeId,
    answered: false,
    ringingAgents: [],
    timeout: null
  }

  sessionsByInboundChannel.set(payload.inboundChannelId, session)

  for (const target of payload.targets) {
    const extension = target.agent?.extension
    if (!extension) continue

    try {
      const originated = await ariClient.originateChannel({
        endpoint: buildAgentEndpoint(extension),
        appArgs: ["agent", session.sessionId, target.agent_id],
        callerId: payload.callerNumber || "Cliente Axion",
        timeoutSeconds: Math.max(15, Math.min(payload.maxWaitSeconds, 60))
      })

      const channelId = String(originated?.id || "")
      if (!channelId) {
        logger.warn("ARI originate returned no channel id", {
          endpoint: buildAgentEndpoint(extension),
          agentId: target.agent_id,
          callId: payload.callId
        })
        continue
      }

      session.ringingAgents.push({
        channelId,
        agentId: target.agent_id
      })
      sessionsByAgentChannel.set(channelId, session)
      await updateAgentStatus(target.agent_id, "ringing", payload.callId)
    } catch (error) {
      logger.warn("Failed to originate call to agent endpoint", {
        endpoint: buildAgentEndpoint(extension),
        agentId: target.agent_id,
        callId: payload.callId,
        error: error instanceof Error ? error.message : String(error)
      })
      await setAgentAvailable(target.agent_id)
    }
  }

  if (session.ringingAgents.length === 0) {
    logger.warn("Queue resolved but no agent channels could be originated", {
      queueId: payload.queueId,
      callId: payload.callId
    })

    await failInboundCall(session, "failed")
    return
  }

  session.timeout = setTimeout(async () => {
    const current = sessionsByInboundChannel.get(payload.inboundChannelId)
    if (!current || current.answered) return

    logger.info("Inbound routing timed out without answer", {
      callId: current.callId,
      queueId: current.queueId
    })

    await failInboundCall(current, "failed")
  }, payload.maxWaitSeconds * 1000)
}

async function handleInboundStasisStart(event: AriEvent) {
  const channel = event.channel
  if (!channel?.id) return

  const channelId = String(channel.id)
  if (sessionsByInboundChannel.has(channelId)) return

  const uniqueId = String(channel?.dialplan?.priority ? channelId : channelId)
  const callerNumber = String(channel?.caller?.number || "")
  const dialedExtension = String(channel?.dialplan?.exten || "")

  const existingCall = await resolveExistingCall({
    uniqueId: String(channel?.name || event.uniqueid || ""),
    channelId
  })

  const matchedQueue = await resolveQueueForInboundNumber({
    calledNumber: String(channel?.dialplan?.exten || ""),
    didNumber: String(channel?.dialplan?.exten || ""),
    dialedExtension
  })

  const call =
    existingCall?.id
      ? existingCall
      : await createInboundCall({
          externalCallId: channelId,
          uniqueId: String(event?.asterisk_id || channel?.id || ""),
          linkedId: String(channel?.connected?.id || ""),
          phone: callerNumber,
          calledNumber: dialedExtension,
          didNumber: dialedExtension,
          dialedExtension,
          queueId: matchedQueue?.id ?? null,
          startedAt: new Date().toISOString()
        })

  if (matchedQueue?.id) {
    await setCallQueued(String(call.id), matchedQueue.id)
  }

  if (!matchedQueue?.id) {
    logger.warn("No active inbound queue matched incoming number", {
      channelId,
      dialedExtension
    })

    await ariClient.answerChannel(channelId)
    await finalizeCall(String(call.id), "failed")
    await ariClient.hangupChannel(channelId)
    return
  }

  const selectedAgents = selectEligibleAgents(matchedQueue)

  if (selectedAgents.length === 0) {
    logger.warn("Queue matched but no available agents were eligible", {
      queueId: matchedQueue.id,
      dialedExtension
    })

    await ariClient.answerChannel(channelId)
    await finalizeCall(String(call.id), "failed")
    await ariClient.hangupChannel(channelId)
    return
  }

  await createCallEvent(String(call.id), "routing.queue_resolved", {
    queueId: matchedQueue.id,
    queueSlug: matchedQueue.slug,
    dialedExtension,
    selectedAgentIds: selectedAgents.map((member) => member.agent_id)
  })

  await startRingForQueue({
    inboundChannelId: channelId,
    callId: String(call.id),
    queueId: matchedQueue.id,
    callerNumber,
    maxWaitSeconds: matchedQueue.max_wait_seconds || 30,
    targets: selectedAgents
  })
}

async function handleAgentStasisStart(event: AriEvent) {
  const channelId = String(event?.channel?.id || "")
  const args = Array.isArray(event?.args) ? event.args.map(String) : []
  const [kind, sessionId, agentId] = args

  if (kind !== "agent" || !sessionId || !agentId || !channelId) return

  const session = Array.from(sessionsByInboundChannel.values()).find(
    (item) => item.sessionId === sessionId
  )
  if (!session) return

  if (!session.ringingAgents.some((item) => item.channelId === channelId)) {
    session.ringingAgents.push({ channelId, agentId })
  }
  sessionsByAgentChannel.set(channelId, session)
}

async function handleChannelStateChange(event: AriEvent) {
  const channelId = String(event?.channel?.id || "")
  const state = String(event?.channel?.state || "")
  if (!channelId || state !== "Up") return

  const session = sessionsByAgentChannel.get(channelId)
  if (!session || session.answered) return

  const selectedAgent = session.ringingAgents.find((item) => item.channelId === channelId)
  if (!selectedAgent) return

  session.answered = true

  await setCallAnswered(session.callId, selectedAgent.agentId, new Date().toISOString())
  await updateAgentStatus(selectedAgent.agentId, "in_call", session.callId)
  await ariClient.addChannelToBridge(String(session.bridgeId), channelId)

  for (const ringingChannel of session.ringingAgents) {
    if (ringingChannel.channelId === channelId) continue

    try {
      await ariClient.hangupChannel(ringingChannel.channelId)
    } catch {
      // ignore cleanup errors
    }

    await setAgentAvailable(ringingChannel.agentId)

    sessionsByAgentChannel.delete(ringingChannel.channelId)
  }

  session.ringingAgents = [selectedAgent]
}

async function handleStasisEnd(event: AriEvent) {
  const channelId = String(event?.channel?.id || "")
  if (!channelId) return

  const inboundSession = sessionsByInboundChannel.get(channelId)
  if (inboundSession) {
    const reason = inboundSession.answered ? "ended" : "abandoned"
    await failInboundCall(inboundSession, reason)
    return
  }

  const session = sessionsByAgentChannel.get(channelId)
  if (!session) return

  sessionsByAgentChannel.delete(channelId)

  const ringingChannel = session.ringingAgents.find((item) => item.channelId === channelId)
  if (ringingChannel) {
    await setAgentAvailable(ringingChannel.agentId)
    session.ringingAgents = session.ringingAgents.filter((item) => item.channelId !== channelId)

    if (!session.answered && session.ringingAgents.length === 0) {
      await failInboundCall(session, "failed")
    }
  }
}

export async function handleAriEvent(event: AriEvent) {
  const type = String(event?.type || "")

  switch (type) {
    case "StasisStart": {
      const args = Array.isArray(event?.args) ? event.args.map(String) : []
      if (args[0] === "agent") {
        await handleAgentStasisStart(event)
      } else {
        await handleInboundStasisStart(event)
      }
      return
    }
    case "ChannelStateChange":
      await handleChannelStateChange(event)
      return
    case "StasisEnd":
    case "ChannelDestroyed":
      await handleStasisEnd(event)
      return
    default:
      return
  }
}
