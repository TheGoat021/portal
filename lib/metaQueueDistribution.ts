import { supabaseAdmin } from "@/lib/supabaseAdmin"
import {
  getMetaConversationManagement,
  upsertMetaConversationManagement
} from "@/lib/metaConversationManagement"

type QueueSettings = {
  auto_distribution_enabled: boolean
  max_simultaneous_enabled: boolean
  max_simultaneous_per_agent: number | null
}

type AgentRow = {
  id: string
  email: string | null
  role: string | null
}

function rotateCandidates(candidates: AgentRow[], lastAssignedUserId: string | null) {
  if (!candidates.length) return candidates
  if (!lastAssignedUserId) return candidates

  const index = candidates.findIndex((item) => item.id === lastAssignedUserId)
  if (index < 0) return candidates

  return [...candidates.slice(index + 1), ...candidates.slice(0, index + 1)]
}

async function getQueueSettings(connectionId: string): Promise<QueueSettings> {
  const { data, error } = await supabaseAdmin
    .from("meta_queue_settings")
    .select("auto_distribution_enabled, max_simultaneous_enabled, max_simultaneous_per_agent")
    .eq("connection_id", connectionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return {
    auto_distribution_enabled: data?.auto_distribution_enabled ?? true,
    max_simultaneous_enabled: Boolean(data?.max_simultaneous_enabled),
    max_simultaneous_per_agent: data?.max_simultaneous_per_agent ?? null
  }
}

export async function getAgentAvailability({
  connectionId,
  userId
}: {
  connectionId: string
  userId: string
}) {
  const { data, error } = await supabaseAdmin
    .from("meta_queue_agent_availability")
    .select("is_active")
    .eq("connection_id", connectionId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.is_active ?? true
}

export async function setAgentAvailability({
  connectionId,
  userId,
  isActive,
  updatedByUserId
}: {
  connectionId: string
  userId: string
  isActive: boolean
  updatedByUserId?: string | null
}) {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from("meta_queue_agent_availability")
    .upsert(
      {
        connection_id: connectionId,
        user_id: userId,
        is_active: isActive,
        updated_by_user_id: updatedByUserId ?? null,
        updated_at: now
      },
      { onConflict: "connection_id,user_id" }
    )
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function tryAutoAssignConversation({
  connectionId,
  conversationId,
  department
}: {
  connectionId: string
  conversationId: string
  department: string
}) {
  const cleanDepartment = (department || "").trim()
  if (!cleanDepartment) return null

  const settings = await getQueueSettings(connectionId)
  if (!settings.auto_distribution_enabled) return null

  const currentManagement = await getMetaConversationManagement(conversationId)
  if (currentManagement?.assigned_user_id) return null

  const { data: agents, error: agentsError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role")
    .eq("role", cleanDepartment)

  if (agentsError) throw new Error(agentsError.message)

  const agentsList: AgentRow[] = (agents ?? []).map((item) => ({
    id: String(item.id),
    email: item.email ? String(item.email) : null,
    role: item.role ? String(item.role) : null
  }))

  if (!agentsList.length) return null

  const agentIds = agentsList.map((item) => item.id)

  const { data: availabilityRows, error: availabilityError } = await supabaseAdmin
    .from("meta_queue_agent_availability")
    .select("user_id, is_active")
    .eq("connection_id", connectionId)
    .in("user_id", agentIds)

  if (availabilityError) throw new Error(availabilityError.message)

  const availabilityMap = new Map<string, boolean>()
  for (const row of availabilityRows ?? []) {
    availabilityMap.set(String(row.user_id), Boolean(row.is_active))
  }

  const hasExplicitAvailability = availabilityMap.size > 0
  let eligibleAgents = agentsList.filter((agent) => {
    if (!hasExplicitAvailability) return true
    return availabilityMap.get(agent.id) === true
  })
  if (!eligibleAgents.length) return null

  if (settings.max_simultaneous_enabled && (settings.max_simultaneous_per_agent ?? 0) > 0) {
    const maxPerAgent = Number(settings.max_simultaneous_per_agent ?? 0)
    const eligibleIds = eligibleAgents.map((item) => item.id)

    const { data: openRows, error: openRowsError } = await supabaseAdmin
      .from("meta_conversation_management")
      .select("assigned_user_id")
      .eq("connection_id", connectionId)
      .eq("status", "open")
      .in("assigned_user_id", eligibleIds)

    if (openRowsError) throw new Error(openRowsError.message)

    const openCountByUser = new Map<string, number>()
    for (const row of openRows ?? []) {
      const userId = row.assigned_user_id ? String(row.assigned_user_id) : ""
      if (!userId) continue
      openCountByUser.set(userId, (openCountByUser.get(userId) ?? 0) + 1)
    }

    eligibleAgents = eligibleAgents.filter((agent) => (openCountByUser.get(agent.id) ?? 0) < maxPerAgent)
    if (!eligibleAgents.length) return null
  }

  eligibleAgents.sort((a, b) => {
    const left = (a.email || a.id).toLowerCase()
    const right = (b.email || b.id).toLowerCase()
    return left.localeCompare(right)
  })

  const { data: rotationRow, error: rotationError } = await supabaseAdmin
    .from("meta_queue_rotation_state")
    .select("last_assigned_user_id")
    .eq("connection_id", connectionId)
    .eq("department", cleanDepartment)
    .maybeSingle()

  if (rotationError) throw new Error(rotationError.message)

  const rotatedAgents = rotateCandidates(
    eligibleAgents,
    rotationRow?.last_assigned_user_id ? String(rotationRow.last_assigned_user_id) : null
  )
  const picked = rotatedAgents[0]
  if (!picked) return null

  await upsertMetaConversationManagement({
    conversation_id: conversationId,
    connection_id: connectionId,
    status: "open",
    assigned_user_id: picked.id,
    assigned_user_email: picked.email,
    assigned_department: cleanDepartment,
    closed_at: null,
    closed_by_user_id: null
  })

  const now = new Date().toISOString()
  const { error: rotationUpsertError } = await supabaseAdmin
    .from("meta_queue_rotation_state")
    .upsert(
      {
        connection_id: connectionId,
        department: cleanDepartment,
        last_assigned_user_id: picked.id,
        last_assigned_at: now,
        updated_at: now
      },
      { onConflict: "connection_id,department" }
    )

  if (rotationUpsertError) throw new Error(rotationUpsertError.message)

  return picked
}
