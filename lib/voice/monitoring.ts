"use client"

import { useEffect, useState } from "react"
import { VoiceMonitoringSnapshot } from "@/lib/voice/monitoringShared"

async function fetchMonitoringSnapshot(userId?: string | null) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : ""
  const response = await fetch(`/api/voice/monitoring${query}`, {
    cache: "no-store"
  })

  if (!response.ok) {
    throw new Error("Falha ao carregar snapshot de monitoramento.")
  }

  return (await response.json()) as VoiceMonitoringSnapshot
}

export function useVoiceMonitoringSnapshot(userId?: string | null) {
  const [snapshot, setSnapshot] = useState<VoiceMonitoringSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = async () => {
    try {
      const next = await fetchMonitoringSnapshot(userId)
      setSnapshot(next)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nao foi possivel carregar o monitoramento."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()

    const interval = window.setInterval(() => {
      void load()
    }, 3000)

    return () => window.clearInterval(interval)
  }, [userId])

  return {
    snapshot,
    loading,
    errorMessage,
    reload: load
  }
}

export type {
  AgentMonitorCardData,
  AgentMonitorTone,
  QueueHealthTone,
  QueueMonitorCardData,
  QueueWaitingEntry,
  VoiceMonitoringSnapshot
} from "@/lib/voice/monitoringShared"
