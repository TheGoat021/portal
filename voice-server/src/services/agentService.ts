import { supabaseAdmin } from "../supabase.js"
import { VoiceAgentStatus } from "../types/agent.js"

export async function listAgents() {
  const { data, error } = await supabaseAdmin
    .from("voice_agents")
    .select("*")
    .order("name")

  if (error) {
    throw new Error(`Failed to list agents: ${error.message}`)
  }

  return data ?? []
}

export async function createAgent(payload: {
  user_id?: string | null
  name: string
  extension: string
  status?: VoiceAgentStatus
}) {
  const { data, error } = await supabaseAdmin
    .from("voice_agents")
    .insert({
      user_id: payload.user_id ?? null,
      name: payload.name,
      extension: payload.extension,
      status: payload.status ?? "offline"
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to create agent: ${error.message}`)
  }

  return data
}

export async function updateAgentStatus(
  agentId: string,
  status: VoiceAgentStatus,
  currentCallId?: string | null
) {
  const { data, error } = await supabaseAdmin
    .from("voice_agents")
    .update({
      status,
      current_call_id: currentCallId ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", agentId)
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to update agent status: ${error.message}`)
  }

  return data
}

export async function listAvailableAgents() {
  const { data, error } = await supabaseAdmin
    .from("voice_agents")
    .select("*")
    .eq("status", "available")
    .order("name")

  if (error) {
    throw new Error(`Failed to list available agents: ${error.message}`)
  }

  return data ?? []
}
