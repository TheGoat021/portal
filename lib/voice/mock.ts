import {
  VoiceAgent,
  VoiceCall,
  VoiceQueue
} from "@/lib/voice/types"

const now = Date.now()

export const mockVoiceQueues: VoiceQueue[] = [
  {
    id: "queue-comercial",
    name: "Fila Comercial",
    slug: "comercial",
    description: "Inbound principal de vendas",
    strategy: "ringall",
    max_wait_seconds: 300,
    active: true
  },
  {
    id: "queue-retencao",
    name: "Fila Retencao",
    slug: "retencao",
    description: "Clientes em renegociacao",
    strategy: "fewestcalls",
    max_wait_seconds: 420,
    active: true
  }
]

export const mockVoiceAgents: VoiceAgent[] = [
  {
    id: "agent-1",
    user_id: "user-1",
    name: "Ana Martins",
    email: "ana@axion.local",
    extension: "2101",
    status: "in_call",
    current_call_id: "call-2",
    updated_at: new Date(now - 11 * 60 * 1000).toISOString()
  },
  {
    id: "agent-2",
    user_id: "user-2",
    name: "Bruno Lima",
    email: "bruno@axion.local",
    extension: "2102",
    status: "available",
    current_call_id: null,
    updated_at: new Date(now - 6 * 60 * 1000).toISOString()
  },
  {
    id: "agent-3",
    user_id: "user-3",
    name: "Carla Souza",
    email: "carla@axion.local",
    extension: "2103",
    status: "paused",
    current_call_id: null,
    updated_at: new Date(now - 14 * 60 * 1000).toISOString()
  },
  {
    id: "agent-4",
    user_id: "user-4",
    name: "Diego Alves",
    email: "diego@axion.local",
    extension: "2104",
    status: "ringing",
    current_call_id: "call-1",
    updated_at: new Date(now - 45 * 1000).toISOString()
  },
  {
    id: "agent-5",
    user_id: "user-5",
    name: "Erika Prado",
    email: "erika@axion.local",
    extension: "2105",
    status: "offline",
    current_call_id: null,
    updated_at: new Date(now - 2 * 60 * 60 * 1000).toISOString()
  }
]

export const mockVoiceCalls: VoiceCall[] = [
  {
    id: "call-1",
    phone: "5511999988776",
    normalized_phone: "5511999988776",
    status: "queued",
    started_at: new Date(now - 145000).toISOString(),
    answered_at: null,
    ended_at: null,
    wait_seconds: 145,
    duration_seconds: null,
    queue_id: "queue-comercial",
    agent_id: null,
    recording_url: null
  },
  {
    id: "call-2",
    phone: "5511988877665",
    normalized_phone: "5511988877665",
    status: "answered",
    started_at: new Date(now - 430000).toISOString(),
    answered_at: new Date(now - 370000).toISOString(),
    ended_at: null,
    wait_seconds: 60,
    duration_seconds: 370,
    queue_id: "queue-comercial",
    agent_id: "agent-1",
    recording_url: null
  },
  {
    id: "call-3",
    phone: "5511977766554",
    normalized_phone: "5511977766554",
    status: "missed",
    started_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    answered_at: null,
    ended_at: new Date(now - 3 * 60 * 60 * 1000 + 54000).toISOString(),
    wait_seconds: 54,
    duration_seconds: 0,
    queue_id: "queue-retencao",
    agent_id: null,
    recording_url: null
  },
  {
    id: "call-4",
    phone: "5511966655443",
    normalized_phone: "5511966655443",
    status: "ended",
    started_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    answered_at: new Date(now - 5 * 60 * 60 * 1000 + 32000).toISOString(),
    ended_at: new Date(now - 5 * 60 * 60 * 1000 + 280000).toISOString(),
    wait_seconds: 32,
    duration_seconds: 248,
    queue_id: "queue-retencao",
    agent_id: "agent-2",
    recording_url: "https://example.com/recordings/call-4.wav"
  },
  {
    id: "call-5",
    phone: "5511955544332",
    normalized_phone: "5511955544332",
    status: "abandoned",
    started_at: new Date(now - 90 * 60 * 1000).toISOString(),
    answered_at: null,
    ended_at: new Date(now - 90 * 60 * 1000 + 70000).toISOString(),
    wait_seconds: 70,
    duration_seconds: 0,
    queue_id: "queue-comercial",
    agent_id: null,
    recording_url: null
  }
]
