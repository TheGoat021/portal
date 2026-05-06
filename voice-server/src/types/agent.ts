export type VoiceAgentStatus =
  | "offline"
  | "available"
  | "ringing"
  | "in_call"
  | "paused"

export type VoiceAgentRow = {
  id: string
  user_id: string | null
  name: string
  extension: string
  status: VoiceAgentStatus
  current_call_id: string | null
  created_at: string
  updated_at: string
}
