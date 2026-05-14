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

export type VoiceCallRow = {
  id: string
  external_call_id: string | null
  unique_id: string | null
  linked_id: string | null
  called_number: string | null
  did_number: string | null
  dialed_extension: string | null
  direction: VoiceCallDirection
  phone: string
  normalized_phone: string
  status: VoiceCallStatus
  queue_id: string | null
  agent_id: string | null
  cliente_id: string | null
  lead_id: string | null
  started_at: string | null
  answered_at: string | null
  ended_at: string | null
  wait_seconds: number | null
  duration_seconds: number | null
  recording_url: string | null
  transcription: string | null
  summary: string | null
  created_at: string
  updated_at: string
}
