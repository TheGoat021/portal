import { mockVoiceAgents, mockVoiceCalls, mockVoiceQueues } from "@/lib/voice/mock"
import { VoiceAgent, VoiceCall, VoiceQueue } from "@/lib/voice/types"

export type QueueHealthTone = "healthy" | "warning" | "critical" | "idle" | "receiving"

export type QueueWaitingEntry = {
  id: string
  phone: string
  waitSeconds: number
  totalWaiting: number
  isNew: boolean
}

export type QueueMonitorCardData = {
  id: string
  name: string
  waitingCount: number
  oldestWaitSeconds: number
  primaryPhone: string | null
  tone: QueueHealthTone
  isBlinking: boolean
  entries: QueueWaitingEntry[]
}

export type AgentMonitorTone =
  | "available"
  | "active"
  | "receptive"
  | "pause"
  | "ringing"
  | "logged_out"
  | "cancel_receptive"

export type AgentMonitorCardData = {
  id: string
  name: string
  extension: string
  seatCode: string | null
  statusLabel: string
  statusDetail: string
  tone: AgentMonitorTone
  statusSinceSeconds: number
  queueName: string | null
  currentPhone: string | null
  totalCalls: number
  activeCalls: number
  receptiveCalls: number
  isCurrentUser: boolean
  isAnimated: boolean
}

export type VoiceMonitoringSnapshot = {
  queueCards: QueueMonitorCardData[]
  agentCards: AgentMonitorCardData[]
  summary: {
    totalQueues: number
    busyQueues: number
    totalWaiting: number
    availableAgents: number
    ringingAgents: number
    inCallAgents: number
    pausedAgents: number
    offlineAgents: number
  }
}

function upperToken(value?: string | null) {
  return String(value || "")
    .replace(/^fila\s+/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
}

function inferQueueTone(waitingCount: number, oldestWaitSeconds: number, hasNewCall: boolean): QueueHealthTone {
  if (waitingCount === 0) return "idle"
  if (oldestWaitSeconds >= 150 || waitingCount >= 4) return "critical"
  if (oldestWaitSeconds >= 60 || waitingCount >= 2) return "warning"
  if (hasNewCall) return "receiving"
  return "healthy"
}

function inferAgentMetrics(calls: VoiceCall[], agentId: string) {
  const agentCalls = calls.filter((call) => call.agent_id === agentId)
  const totalCalls = agentCalls.length
  const activeCalls = agentCalls.filter((call) => call.direction === "outbound").length
  const receptiveCalls = agentCalls.filter((call) => call.direction !== "outbound").length

  return {
    totalCalls,
    activeCalls,
    receptiveCalls
  }
}

function inferAgentPresentation(
  agent: VoiceAgent,
  currentCall: VoiceCall | null,
  queueName: string | null
) {
  const statusSinceSeconds = agent.updated_at
    ? Math.max(0, Math.round((Date.now() - new Date(agent.updated_at).getTime()) / 1000))
    : 0

  if (agent.status === "available") {
    return {
      statusSinceSeconds,
      statusLabel: "DISPONIVEL",
      statusDetail: queueName ?? "Monitoramento ativo",
      tone: "available" as AgentMonitorTone
    }
  }

  if (agent.status === "ringing") {
    return {
      statusSinceSeconds,
      statusLabel: queueName ? `${queueName} TOCANDO` : "TOCANDO",
      statusDetail: queueName ?? "Oferta de chamada",
      tone: "ringing" as AgentMonitorTone
    }
  }

  if (agent.status === "paused") {
    return {
      statusSinceSeconds,
      statusLabel: "PAUSA RAMAL",
      statusDetail: queueName ?? "Operacao pausada",
      tone: "pause" as AgentMonitorTone
    }
  }

  if (agent.status === "in_call") {
    const isInbound = currentCall?.direction !== "outbound"
    return {
      statusSinceSeconds,
      statusLabel: isInbound ? (queueName ? `${queueName} RECEPTIVO` : "RECEPTIVO") : "ATIVO",
      statusDetail: queueName ?? (isInbound ? "Ligacao receptiva" : "Ligacao ativa"),
      tone: (isInbound ? "receptive" : "active") as AgentMonitorTone
    }
  }

  return {
    statusSinceSeconds,
    statusLabel: "DESLOGADO",
    statusDetail: "Sem sessao",
    tone: "logged_out" as AgentMonitorTone
  }
}

export function buildVoiceMonitoringSnapshot(
  calls: VoiceCall[],
  agents: VoiceAgent[],
  queues: VoiceQueue[],
  userId?: string | null
): VoiceMonitoringSnapshot {
  const shouldUseMockScenario = calls.length === 0 && agents.length === 0 && queues.length === 0
  const sourceCalls = calls.length > 0 ? calls : shouldUseMockScenario ? mockVoiceCalls : []
  const sourceAgents = agents.length > 0 ? agents : shouldUseMockScenario ? mockVoiceAgents : []
  const sourceQueues = queues.length > 0 ? queues : shouldUseMockScenario ? mockVoiceQueues : []

  const queueMap = new Map(sourceQueues.map((queue) => [queue.id, queue]))
  const activeCallMap = new Map(sourceCalls.map((call) => [call.id, call]))

  const queueCards = sourceQueues
    .map((queue) => {
      const waitingCalls = sourceCalls
        .filter((call) => call.queue_id === queue.id && (call.status === "queued" || call.status === "ringing"))
        .sort((left, right) => (right.wait_seconds ?? 0) - (left.wait_seconds ?? 0))

      const totalWaiting = waitingCalls.length
      const entries = waitingCalls.slice(0, 3).map((call) => ({
        id: call.id,
        phone: call.phone,
        waitSeconds: call.wait_seconds ?? 0,
        totalWaiting,
        isNew: (call.wait_seconds ?? 0) <= 8 || call.status === "ringing"
      }))
      const oldestWaitSeconds = entries[0]?.waitSeconds ?? 0
      const hasNewCall = entries.some((entry) => entry.isNew)

      return {
        id: queue.id,
        name: upperToken(queue.name || queue.slug),
        waitingCount: totalWaiting,
        oldestWaitSeconds,
        primaryPhone: entries[0]?.phone ?? null,
        tone: inferQueueTone(totalWaiting, oldestWaitSeconds, hasNewCall),
        isBlinking: oldestWaitSeconds >= 120,
        entries
      } satisfies QueueMonitorCardData
    })
    .sort((left, right) => right.waitingCount - left.waitingCount || right.oldestWaitSeconds - left.oldestWaitSeconds)

  const agentCards = [...sourceAgents]
    .sort((left, right) => {
      if (left.user_id === userId) return -1
      if (right.user_id === userId) return 1
      return left.extension.localeCompare(right.extension)
    })
    .map((agent) => {
      const currentCall =
        (agent.current_call_id ? activeCallMap.get(agent.current_call_id) ?? null : null) ??
        sourceCalls.find(
          (call) =>
            call.agent_id === agent.id &&
            (call.status === "ringing" || call.status === "queued" || call.status === "answered")
        ) ??
        null

      const queueName = currentCall?.queue_id
        ? upperToken(queueMap.get(currentCall.queue_id)?.name)
        : null
      const currentPhone = currentCall?.phone ?? null
      const metrics = inferAgentMetrics(sourceCalls, agent.id)
      const presentation = inferAgentPresentation(agent, currentCall, queueName)

      return {
        id: agent.id,
        name: agent.name,
        extension: agent.extension,
        seatCode: null,
        statusLabel: presentation.statusLabel,
        statusDetail: presentation.statusDetail,
        tone: presentation.tone,
        statusSinceSeconds: presentation.statusSinceSeconds,
        queueName,
        currentPhone,
        totalCalls: metrics.totalCalls,
        activeCalls: metrics.activeCalls,
        receptiveCalls: metrics.receptiveCalls,
        isCurrentUser: agent.user_id === userId,
        isAnimated: presentation.tone === "ringing"
      } satisfies AgentMonitorCardData
    })

  return {
    queueCards,
    agentCards,
    summary: {
      totalQueues: queueCards.length,
      busyQueues: queueCards.filter((queue) => queue.waitingCount > 0).length,
      totalWaiting: queueCards.reduce((sum, queue) => sum + queue.waitingCount, 0),
      availableAgents: agentCards.filter((agent) => agent.tone === "available").length,
      ringingAgents: agentCards.filter((agent) => agent.tone === "ringing").length,
      inCallAgents: agentCards.filter((agent) => agent.tone === "active" || agent.tone === "receptive").length,
      pausedAgents: agentCards.filter((agent) => agent.tone === "pause").length,
      offlineAgents: agentCards.filter((agent) => agent.tone === "logged_out").length
    }
  }
}
