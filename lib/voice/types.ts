export type VoiceAgentStatus =
  | "offline"
  | "available"
  | "ringing"
  | "in_call"
  | "paused"

export type VoiceCallStatus =
  | "ringing"
  | "queued"
  | "answered"
  | "missed"
  | "abandoned"
  | "transferred"
  | "ended"
  | "failed"

export type VoiceAgent = {
  id: string
  name: string
  extension: string
  status: VoiceAgentStatus
  current_call_id: string | null
  updated_at?: string | null
}

export type VoiceQueue = {
  id: string
  name: string
  slug: string
  description?: string | null
  strategy: string
  max_wait_seconds?: number
  active: boolean
}

export type VoiceCall = {
  id: string
  phone: string
  normalized_phone?: string
  status: VoiceCallStatus
  started_at: string | null
  answered_at: string | null
  ended_at: string | null
  wait_seconds: number | null
  duration_seconds: number | null
  queue_id: string | null
  agent_id: string | null
  recording_url: string | null
  cliente_id?: string | null
  lead_id?: string | null
}

export type VoiceDashboardMetrics = {
  answeredToday: number
  missedToday: number
  slaPercent: number
  avgHandleSeconds: number
  avgWaitSeconds: number
  avgAbandonSeconds: number
}

export type VoiceQueueSummary = {
  id: string
  name: string
  slug: string
  active: boolean
  callsInQueue: number
  avgWaitSeconds: number
  activeAgents: number
  statusLabel: string
}

export type VoiceCaller = {
  id: string
  name: string | null
  phone: string
  waitSeconds: number
  queueId: string | null
  queueName: string
  status: VoiceCallStatus
}

export type VoiceCallTableRow = {
  id: string
  clientName: string
  phone: string
  agentName: string
  queueName: string
  status: VoiceCallStatus
  durationSeconds: number
  createdAtLabel: string
  recordingUrl: string | null
}
