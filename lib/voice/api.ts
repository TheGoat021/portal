"use client"

import { useEffect, useMemo, useState } from "react"
import {
  VoiceAgent,
  VoiceCall,
  VoiceCaller,
  VoiceCallTableRow,
  VoiceDashboardMetrics,
  VoiceQueue,
  VoiceQueueSummary
} from "@/lib/voice/types"

const apiBase =
  process.env.NEXT_PUBLIC_AXION_VOICE_API_URL?.replace(/\/$/, "") || ""

const softphonePasswordTemplate =
  process.env.NEXT_PUBLIC_AXION_VOICE_SIP_PASSWORD_TEMPLATE || ""
const softphoneUsernameSuffix =
  process.env.NEXT_PUBLIC_AXION_VOICE_SIP_USERNAME_SUFFIX || ""

function average(values: number[]) {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function formatSeconds(seconds?: number | null) {
  if (!seconds || seconds < 0) return "00:00"
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export function formatPhone(phone?: string | null) {
  if (!phone) return "Sem telefone"

  const digits = String(phone).replace(/\D/g, "")
  const national = digits.startsWith("55") ? digits.slice(2) : digits

  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`
  }

  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`
  }

  return phone
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Request failed for ${path}`)
  }

  return response.json()
}

export type VoiceSoftphoneIdentity = {
  agentId: string
  userId: string | null
  extension: string
  sipUsername: string
  sipPassword: string
  displayName: string
}

export type VoiceProvisionUser = {
  id: string
  email: string | null
  role?: string | null
}

function decorateCalls(calls: VoiceCall[]) {
  return calls.map((call, index) => ({
    ...call,
    clientName: `Contato ${index + 1}`
  }))
}

export function useVoiceData() {
  const [calls, setCalls] = useState<VoiceCall[]>([])
  const [agents, setAgents] = useState<VoiceAgent[]>([])
  const [queues, setQueues] = useState<VoiceQueue[]>([])
  const [loading, setLoading] = useState(true)
  const [statusText, setStatusText] = useState(
    apiBase ? "Sincronizando telefonia..." : "Modo demonstrativo ativo."
  )

  const load = async () => {
    if (!apiBase) {
      setLoading(true)
      try {
        const [queueResponse, agentResponse] = await Promise.all([
          fetch("/api/voice/queues", { cache: "no-store" }),
          fetch("/api/voice/agents", { cache: "no-store" })
        ])

        if (queueResponse.ok) {
          const queuePayload = (await queueResponse.json()) as {
            queues?: VoiceQueue[]
          }
          setQueues(queuePayload.queues ?? [])
        }

        if (agentResponse.ok) {
          const agentPayload = (await agentResponse.json()) as {
            agents?: VoiceAgent[]
          }
          setAgents(agentPayload.agents ?? [])
        }

        setStatusText("Dados locais do Axion Voice carregados.")
      } catch (_error) {
        setStatusText("Modo demonstrativo ativo.")
      } finally {
        setLoading(false)
      }

      return
    }

    setLoading(true)
    try {
      const [activeCalls, historyCalls, queueRows, agentRows] = await Promise.all([
        fetchJson<VoiceCall[]>("/calls/active"),
        fetchJson<VoiceCall[]>("/calls/history"),
        fetchJson<VoiceQueue[]>("/queues"),
        fetchJson<VoiceAgent[]>("/agents")
      ])

      setCalls([...activeCalls, ...historyCalls])
      setQueues(queueRows)
      setAgents(agentRows)
      setStatusText("Dados atualizados em tempo quase real.")
    } catch (_error) {
      setStatusText("Sem resposta da API no momento. Exibindo estrutura pronta para integração.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()

    if (!apiBase) return

    const interval = window.setInterval(load, 10000)
    return () => window.clearInterval(interval)
  }, [])

  return {
    calls,
    agents,
    queues,
    loading,
    statusText,
    reload: load,
    apiBase
  }
}

export function deriveSoftphoneIdentity(agent?: VoiceAgent | null): VoiceSoftphoneIdentity | null {
  if (!agent?.extension) return null

  const sipUsername = `${agent.extension}${softphoneUsernameSuffix}`
  const sipPassword = softphonePasswordTemplate
    ? softphonePasswordTemplate
        .replaceAll("{extension}", agent.extension)
        .replaceAll("{sipUsername}", sipUsername)
        .replaceAll("{userId}", agent.user_id ?? "")
        .replaceAll("{email}", agent.email ?? "")
    : `${agent.extension}@Axion`

  return {
    agentId: agent.id,
    userId: agent.user_id,
    extension: agent.extension,
    sipUsername,
    sipPassword,
    displayName: agent.name
  }
}

export function useCurrentVoiceAgent(agents: VoiceAgent[], userId?: string | null) {
  return useMemo(() => {
    if (!userId) return null
    return agents.find((agent) => agent.user_id === userId) ?? null
  }, [agents, userId])
}

function sanitizeQueueSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function useVoiceProvisionDirectory() {
  const [unassignedUsers, setUnassignedUsers] = useState<VoiceProvisionUser[]>([])
  const [agents, setAgents] = useState<VoiceAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/voice/agents", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Falha ao consultar o diretorio de agentes.")
      }

      const payload = (await response.json()) as {
        agents?: VoiceAgent[]
        unassignedUsers?: VoiceProvisionUser[]
        warning?: string
      }

      setAgents(payload.agents ?? [])
      setUnassignedUsers(payload.unassignedUsers ?? [])
      setErrorMessage(null)
      setWarningMessage(payload.warning ?? null)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar os usuarios disponiveis para provisionamento."
      setErrorMessage(message)
      setWarningMessage(null)
    } finally {
      setLoading(false)
    }
  }

  const provision = async (input: {
    userId: string
    extension: string
    status?: VoiceAgent["status"]
  }) => {
    const response = await fetch("/api/voice/agents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: input.userId,
        extension: input.extension,
        status: input.status ?? "offline"
      })
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(payload?.error || "Falha ao provisionar ramal.")
    }

    await load()
  }

  useEffect(() => {
    void load()
  }, [])

  return {
    unassignedUsers,
    agents,
    loading,
    errorMessage,
    warningMessage,
    reload: load,
    provision
  }
}

export function useVoiceQueueDirectory() {
  const [queues, setQueues] = useState<VoiceQueue[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/voice/queues", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Falha ao consultar as filas do Axion Voice.")
      }

      const payload = (await response.json()) as {
        queues?: VoiceQueue[]
      }

      setQueues(payload.queues ?? [])
      setErrorMessage(null)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar as filas do Axion Voice."
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const createQueue = async (input: {
    name: string
    slug?: string
    description?: string | null
    inboundNumber?: string | null
    strategy: string
    maxWaitSeconds: number
    active: boolean
    members?: Array<{
      agentId: string
      priority: number
      active: boolean
    }>
  }) => {
    setSaving(true)

    try {
      const response = await fetch("/api/voice/queues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: input.name,
          slug: sanitizeQueueSlug(input.slug || input.name),
          description: input.description ?? null,
          inbound_number: input.inboundNumber ? input.inboundNumber.replace(/\D/g, "") : null,
          strategy: input.strategy,
          max_wait_seconds: input.maxWaitSeconds,
          active: input.active,
          members: (input.members ?? []).map((member) => ({
            agent_id: member.agentId,
            priority: member.priority,
            active: member.active
          }))
        })
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || "Falha ao criar fila.")
      }

      await load()
    } finally {
      setSaving(false)
    }
  }

  const updateQueue = async (
    queueId: string,
    input: {
      name: string
      slug?: string
      description?: string | null
      inboundNumber?: string | null
      strategy: string
      maxWaitSeconds: number
      active: boolean
      members?: Array<{
        agentId: string
        priority: number
        active: boolean
      }>
    }
  ) => {
    setSaving(true)

    try {
      const response = await fetch(`/api/voice/queues/${queueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: input.name,
          slug: sanitizeQueueSlug(input.slug || input.name),
          description: input.description ?? null,
          inbound_number: input.inboundNumber ? input.inboundNumber.replace(/\D/g, "") : null,
          strategy: input.strategy,
          max_wait_seconds: input.maxWaitSeconds,
          active: input.active,
          members: (input.members ?? []).map((member) => ({
            agent_id: member.agentId,
            priority: member.priority,
            active: member.active
          }))
        })
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || "Falha ao atualizar fila.")
      }

      await load()
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return {
    queues,
    loading,
    saving,
    errorMessage,
    reload: load,
    createQueue,
    updateQueue
  }
}

export function useVoiceDerivedData(calls: VoiceCall[], agents: VoiceAgent[], queues: VoiceQueue[]) {
  return useMemo(() => {
    const queueMap = new Map(queues.map((queue) => [queue.id, queue]))
    const agentMap = new Map(agents.map((agent) => [agent.id, agent]))
    const decoratedCalls = decorateCalls(calls)
    const now = new Date()

    const metrics: VoiceDashboardMetrics = {
      answeredToday: decoratedCalls.filter((call) => {
        if (!call.answered_at) return false
        return new Date(call.answered_at).toDateString() === now.toDateString()
      }).length,
      missedToday: decoratedCalls.filter((call) => {
        if (call.status !== "missed" && call.status !== "abandoned") return false
        if (!call.ended_at) return false
        return new Date(call.ended_at).toDateString() === now.toDateString()
      }).length,
      slaPercent: (() => {
        const answered = decoratedCalls.filter((call) => call.status === "answered" || call.status === "ended")
        if (answered.length === 0) return 0
        const withinSla = answered.filter((call) => (call.wait_seconds ?? 0) <= 20).length
        return Math.round((withinSla / answered.length) * 100)
      })(),
      avgHandleSeconds: average(
        decoratedCalls
          .map((call) => call.duration_seconds ?? 0)
          .filter((value) => value > 0)
      ),
      avgWaitSeconds: average(
        decoratedCalls
          .map((call) => call.wait_seconds ?? 0)
          .filter((value) => value > 0)
      ),
      avgAbandonSeconds: average(
        decoratedCalls
          .filter((call) => call.status === "abandoned" || call.status === "missed")
          .map((call) => call.wait_seconds ?? 0)
          .filter((value) => value > 0)
      )
    }

    const queueSummaries: VoiceQueueSummary[] = queues.map((queue) => {
      const queueCalls = decoratedCalls.filter(
        (call) =>
          call.queue_id === queue.id &&
          (call.status === "queued" || call.status === "ringing" || call.status === "answered")
      )
      const activeAgents = agents.filter((agent) => {
        if (agent.status === "offline") return false
        return queue.slug === "comercial" || Boolean(agent.id)
      }).length

      return {
        id: queue.id,
        name: queue.name,
        slug: queue.slug,
        inbound_number: queue.inbound_number ?? null,
        active: queue.active,
        callsInQueue: queueCalls.filter((call) => call.status !== "answered").length,
        avgWaitSeconds: average(queueCalls.map((call) => call.wait_seconds ?? 0).filter((value) => value > 0)),
        activeAgents,
        statusLabel: queue.active ? "funcionando" : "inativa"
      }
    })

    const queueCallers: VoiceCaller[] = decoratedCalls
      .filter((call) => call.status === "queued" || call.status === "ringing")
      .map((call) => ({
        id: call.id,
        name: call.clientName,
        phone: call.phone,
        waitSeconds: call.wait_seconds ?? 0,
        queueId: call.queue_id,
        queueName: queueMap.get(call.queue_id || "")?.name || "Fila sem nome",
        status: call.status
      }))

    const tableRows: VoiceCallTableRow[] = decoratedCalls.map((call) => ({
      id: call.id,
      clientName: call.clientName,
      phone: call.phone,
      agentName: call.agent_id ? agentMap.get(call.agent_id)?.name || "Agente nao identificado" : "Nao atribuido",
      queueName: queueMap.get(call.queue_id || "")?.name || "Sem fila",
      status: call.status,
      durationSeconds: call.duration_seconds ?? 0,
      createdAtLabel: new Date(call.started_at || Date.now()).toLocaleString("pt-BR"),
      recordingUrl: call.recording_url
    }))

    return {
      metrics,
      queueSummaries,
      queueCallers,
      tableRows
    }
  }, [agents, calls, queues])
}
