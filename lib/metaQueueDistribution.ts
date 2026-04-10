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

async function insertDistributionLog(payload: {
  connectionId: string
  conversationId: string
  department: string
  status: string
  reason?: string | null
  selectedUserId?: string | null
  selectedUserEmail?: string | null
  candidatesCount?: number | null
  eligibleCount?: number | null
  details?: Record<string, unknown>
}) {
  console.log("META DISTRIBUTION LOG:", {
    connectionId: payload.connectionId,
    conversationId: payload.conversationId,
    department: payload.department,
    status: payload.status,
    reason: payload.reason ?? null,
    selectedUserId: payload.selectedUserId ?? null,
    selectedUserEmail: payload.selectedUserEmail ?? null,
    candidatesCount: payload.candidatesCount ?? null,
    eligibleCount: payload.eligibleCount ?? null,
    details: payload.details ?? {}
  })

  const { error } = await supabaseAdmin.from("meta_queue_distribution_logs").insert({
    connection_id: payload.connectionId,
    conversation_id: payload.conversationId,
    department: payload.department,
    status: payload.status,
    reason: payload.reason ?? null,
    selected_user_id: payload.selectedUserId ?? null,
    selected_user_email: payload.selectedUserEmail ?? null,
    candidates_count: payload.candidatesCount ?? null,
    eligible_count: payload.eligibleCount ?? null,
    details: payload.details ?? {}
  })

  if (error) {
    console.error("Falha ao inserir log de distribuicao Meta:", error.message)
  }
}

export async function logMetaQueueDistributionEvent(payload: {
  connectionId: string
  conversationId: string
  department: string
  status: string
  reason?: string | null
  selectedUserId?: string | null
  selectedUserEmail?: string | null
  candidatesCount?: number | null
  eligibleCount?: number | null
  details?: Record<string, unknown>
}) {
  await insertDistributionLog(payload)
}

function normalizeRoleText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
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
  const normalizedDepartment = normalizeRoleText(cleanDepartment)

  console.log("META DISTRIBUTION START:", {
    connectionId,
    conversationId,
    department: cleanDepartment,
    normalizedDepartment
  })

  try {
    const settings = await getQueueSettings(connectionId)
    console.log("META DISTRIBUTION SETTINGS:", {
      connectionId,
      conversationId,
      settings
    })

    if (!settings.auto_distribution_enabled) {
      await insertDistributionLog({
        connectionId,
        conversationId,
        department: cleanDepartment,
        status: "skipped",
        reason: "auto_distribution_disabled"
      })
      return null
    }

    const currentManagement = await getMetaConversationManagement(conversationId)
    console.log("META DISTRIBUTION CURRENT MANAGEMENT:", {
      connectionId,
      conversationId,
      assigned_user_id: currentManagement?.assigned_user_id ?? null,
      assigned_department: currentManagement?.assigned_department ?? null,
      status: currentManagement?.status ?? null
    })

    if (currentManagement?.assigned_user_id) {
      await insertDistributionLog({
        connectionId,
        conversationId,
        department: cleanDepartment,
        status: "skipped",
        reason: "already_assigned",
        selectedUserId: currentManagement.assigned_user_id,
        selectedUserEmail: currentManagement.assigned_user_email
      })
      return null
    }

    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .not("role", "is", null)

    if (agentsError) throw new Error(agentsError.message)

    const agentsList: AgentRow[] = (agents ?? [])
      .map((item) => ({
        id: String(item.id),
        email: item.email ? String(item.email) : null,
        role: item.role ? String(item.role) : null
      }))
      .filter((item) => normalizeRoleText(item.role || "") === normalizedDepartment)

    console.log("META DISTRIBUTION CANDIDATES:", {
      connectionId,
      conversationId,
      department: cleanDepartment,
      candidates: agentsList.map((item) => ({
        id: item.id,
        email: item.email,
        role: item.role
      }))
    })

    if (!agentsList.length) {
      await insertDistributionLog({
        connectionId,
        conversationId,
        department: cleanDepartment,
        status: "not_assigned",
        reason: "no_agents_for_role",
        candidatesCount: 0,
        eligibleCount: 0
      })
      return null
    }

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

    let eligibleAgents = agentsList.filter((agent) => availabilityMap.get(agent.id) !== false)
    console.log("META DISTRIBUTION ELIGIBLE AFTER AVAILABILITY:", {
      connectionId,
      conversationId,
      department: cleanDepartment,
      eligible: eligibleAgents.map((item) => ({
        id: item.id,
        email: item.email,
        role: item.role
      })),
      availability: Array.from(availabilityMap.entries()).map(([userId, isActive]) => ({ userId, isActive }))
    })

    if (!eligibleAgents.length) {
      await insertDistributionLog({
        connectionId,
        conversationId,
        department: cleanDepartment,
        status: "not_assigned",
        reason: "no_active_agents",
        candidatesCount: agentsList.length,
        eligibleCount: 0
      })
      return null
    }

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
      console.log("META DISTRIBUTION ELIGIBLE AFTER CAPACITY:", {
        connectionId,
        conversationId,
        department: cleanDepartment,
        maxPerAgent,
        eligible: eligibleAgents.map((item) => ({
          id: item.id,
          email: item.email,
          role: item.role
        })),
        openCountByUser: Array.from(openCountByUser.entries()).map(([userId, count]) => ({ userId, count }))
      })

      if (!eligibleAgents.length) {
        await insertDistributionLog({
          connectionId,
          conversationId,
          department: cleanDepartment,
          status: "not_assigned",
          reason: "capacity_reached",
          candidatesCount: agentsList.length,
          eligibleCount: 0,
          details: {
            maxPerAgent
          }
        })
        return null
      }
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
    console.log("META DISTRIBUTION ROTATION:", {
      connectionId,
      conversationId,
      department: cleanDepartment,
      lastAssignedUserId: rotationRow?.last_assigned_user_id ? String(rotationRow.last_assigned_user_id) : null,
      rotatedOrder: rotatedAgents.map((item) => ({
        id: item.id,
        email: item.email
      }))
    })

    const picked = rotatedAgents[0]
    if (!picked) {
      await insertDistributionLog({
        connectionId,
        conversationId,
        department: cleanDepartment,
        status: "not_assigned",
        reason: "no_candidate_after_rotation",
        candidatesCount: agentsList.length,
        eligibleCount: eligibleAgents.length
      })
      return null
    }

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

    console.log("META DISTRIBUTION ASSIGNED:", {
      connectionId,
      conversationId,
      department: cleanDepartment,
      selectedUserId: picked.id,
      selectedUserEmail: picked.email
    })

    await insertDistributionLog({
      connectionId,
      conversationId,
      department: cleanDepartment,
      status: "assigned",
      reason: "ok",
      selectedUserId: picked.id,
      selectedUserEmail: picked.email,
      candidatesCount: agentsList.length,
      eligibleCount: eligibleAgents.length
    })

    return picked
  } catch (error: unknown) {
    await insertDistributionLog({
      connectionId,
      conversationId,
      department: cleanDepartment,
      status: "error",
      reason: error instanceof Error ? error.message : "unknown_error"
    })
    throw error
  }
}
