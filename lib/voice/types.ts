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

export type VoiceCallDirection = "inbound" | "outbound"

export type VoiceAgent = {
  id: string
  user_id: string | null
  name: string
  email?: string | null
  extension: string
  status: VoiceAgentStatus
  current_call_id: string | null
  updated_at?: string | null
}

export type VoiceQueueMember = {
  id: string
  queue_id?: string
  agent_id: string
  priority: number
  active: boolean
  agent?: VoiceAgent | null
}

export type VoiceQueue = {
  id: string
  name: string
  slug: string
  description?: string | null
  inbound_number?: string | null
  strategy: string
  max_wait_seconds?: number
  active: boolean
  created_at?: string | null
  updated_at?: string | null
  members?: VoiceQueueMember[]
}

export type VoiceCall = {
  id: string
  phone: string
  normalized_phone?: string
  called_number?: string | null
  did_number?: string | null
  dialed_extension?: string | null
  direction?: VoiceCallDirection | null
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
  inbound_number?: string | null
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
  direction: VoiceCallDirection
  agentName: string
  queueName: string
  status: VoiceCallStatus
  durationSeconds: number
  startedAt: string | null
  createdAtLabel: string
  recordingUrl: string | null
}
