export type VoiceQueueStrategy =
  | "ringall"
  | "leastrecent"
  | "fewestcalls"
  | "random"
  | "rrmemory"

export type VoiceQueueRow = {
  id: string
  name: string
  slug: string
  description: string | null
  strategy: VoiceQueueStrategy | string
  max_wait_seconds: number
  active: boolean
  created_at: string
  updated_at: string
}
