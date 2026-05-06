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
import {
  mockVoiceAgents,
  mockVoiceCalls,
  mockVoiceQueues
} from "@/lib/voice/mock"

const apiBase =
  process.env.NEXT_PUBLIC_AXION_VOICE_API_URL?.replace(/\/$/, "") || ""

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

function decorateCalls(calls: VoiceCall[]) {
  return calls.map((call, index) => ({
    ...call,
    clientName: `Contato ${index + 1}`
  }))
}

export function useVoiceData() {
  const [calls, setCalls] = useState<VoiceCall[]>(mockVoiceCalls)
  const [agents, setAgents] = useState<VoiceAgent[]>(mockVoiceAgents)
  const [queues, setQueues] = useState<VoiceQueue[]>(mockVoiceQueues)
  const [loading, setLoading] = useState(Boolean(apiBase))
  const [statusText, setStatusText] = useState(
    apiBase ? "Sincronizando telefonia..." : "Modo demonstrativo ativo."
  )

  const load = async () => {
    if (!apiBase) return

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
