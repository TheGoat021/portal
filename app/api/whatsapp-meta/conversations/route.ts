// app/api/whatsapp-meta/conversations/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { tryAutoAssignConversation } from '@/lib/metaQueueDistribution'

function parseRawPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  if (typeof raw === "object") return raw as Record<string, unknown>
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>
    } catch {}
  }
  return null
}

function isOperatorOutbound(rawPayload: unknown) {
  const parsed = parseRawPayload(rawPayload)
  if (!parsed) return false

  const directAgentId = String(parsed.agentId ?? parsed.agent_id ?? "").trim()
  const directAgentEmail = String(parsed.agentEmail ?? parsed.agent_email ?? "").trim()
  if (directAgentId || directAgentEmail) return true

  const nestedSend =
    parsed.send && typeof parsed.send === "object"
      ? (parsed.send as Record<string, unknown>)
      : null

  const nestedAgentId = nestedSend ? String(nestedSend.agentId ?? nestedSend.agent_id ?? "").trim() : ""
  const nestedAgentEmail = nestedSend ? String(nestedSend.agentEmail ?? nestedSend.agent_email ?? "").trim() : ""
  return Boolean(nestedAgentId || nestedAgentEmail)
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const connectionId = url.searchParams.get('connectionId')
    const search = url.searchParams.get('search')?.trim() || ''
    const userId = url.searchParams.get("userId")?.trim() || ""
    const userRole = (url.searchParams.get("userRole")?.trim() || "").toUpperCase()
    const isDiretoria =
      userRole === "DIRETORIA" ||
      userRole === "ADMINISTRAÇÃO" ||
      userRole === "ADMINISTRACAO" ||
      userRole === "ADMIN"

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId é obrigatório' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('meta_conversations')
      .select('*')
      .eq('connection_id', connectionId)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (search) {
      query = query.or(
        `wa_id.ilike.%${search}%,contact_name.ilike.%${search}%,profile_name.ilike.%${search}%,last_message.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let { data: managementRows, error: managementRowsError } = await supabaseAdmin
      .from("meta_conversation_management")
      .select("conversation_id, status, assigned_user_id, assigned_department, updated_at")
      .eq("connection_id", connectionId)
      .order("updated_at", { ascending: false })

    if (managementRowsError) {
      return NextResponse.json({ error: managementRowsError.message }, { status: 500 })
    }

    const { data: queueSettings } = await supabaseAdmin
      .from("meta_queue_settings")
      .select(
        "response_alerts_enabled, response_alert_warning_minutes, response_alert_danger_minutes, auto_close_inactive_enabled, inactive_close_minutes"
      )
      .eq("connection_id", connectionId)
      .maybeSingle()

    const { data: reminderRowsRaw, error: reminderRowsError } = await supabaseAdmin
      .from("meta_conversation_reminders")
      .select("conversation_id, scheduled_for, description")
      .eq("connection_id", connectionId)
      .is("completed_at", null)

    const reminderTableMissing =
      reminderRowsError &&
      /meta_conversation_reminders/i.test(reminderRowsError.message || "")

    if (reminderRowsError && !reminderTableMissing) {
      return NextResponse.json({ error: reminderRowsError.message }, { status: 500 })
    }
    if (reminderTableMissing) {
      console.warn("Tabela meta_conversation_reminders ausente; seguindo sem lembretes.")
    }

    const reminderRows = reminderTableMissing ? [] : reminderRowsRaw ?? []

    const alertsEnabled = Boolean(queueSettings?.response_alerts_enabled)
    const warningMinutes = Number(queueSettings?.response_alert_warning_minutes ?? 10)
    const dangerMinutes = Number(queueSettings?.response_alert_danger_minutes ?? 30)

    const conversationIds = (data ?? []).map((conversation) => String(conversation.id))
    const latestInboundByConversation = new Map<string, string>()
    const latestOutboundByConversation = new Map<string, string>()

    if (conversationIds.length > 0) {
      const [{ data: inboundRows }, { data: outboundRowsRaw }] = await Promise.all([
        supabaseAdmin
          .from("meta_messages")
          .select("conversation_id, created_at")
          .in("conversation_id", conversationIds)
          .eq("direction", "inbound")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("meta_messages")
          .select("conversation_id, created_at, raw_payload")
          .in("conversation_id", conversationIds)
          .eq("direction", "outbound")
          .neq("type", "system")
          .order("created_at", { ascending: false })
      ])

      for (const row of inboundRows ?? []) {
        const conversationId = String(row.conversation_id)
        if (!latestInboundByConversation.has(conversationId)) {
          latestInboundByConversation.set(conversationId, String(row.created_at))
        }
      }

      for (const row of outboundRowsRaw ?? []) {
        if (!isOperatorOutbound((row as { raw_payload?: unknown }).raw_payload)) {
          continue
        }
        const conversationId = String(row.conversation_id)
        if (!latestOutboundByConversation.has(conversationId)) {
          latestOutboundByConversation.set(conversationId, String(row.created_at))
        }
      }
    }

    // Hotfix: nao fecha conversas dentro da listagem.
    // O auto-close sera executado em rotina dedicada para evitar fechamento em massa.

    // Re-tenta atribuicao para conversas sem operador (evita ficarem presas invisiveis).
    const pendingAutoAssign = new Map<string, string>()
    for (const row of managementRows ?? []) {
      const conversationId = String(row.conversation_id)
      const status = String(row.status || "open")
      const assignedUserId = row.assigned_user_id ? String(row.assigned_user_id) : ""
      const department = row.assigned_department ? String(row.assigned_department).trim() : ""

      if (status !== "open") continue
      if (assignedUserId) continue
      if (!department) continue
      if (!pendingAutoAssign.has(conversationId)) {
        pendingAutoAssign.set(conversationId, department)
      }
    }

    if (pendingAutoAssign.size > 0) {
      for (const [conversationId, department] of pendingAutoAssign.entries()) {
        try {
          await tryAutoAssignConversation({
            connectionId,
            conversationId,
            department
          })
        } catch (assignError) {
          console.error("Erro ao reprocessar atribuicao automatica:", {
            connectionId,
            conversationId,
            department,
            error: assignError instanceof Error ? assignError.message : String(assignError)
          })
        }
      }

      // Recarrega estado de gestao apos tentativas de atribuicao/auto-close.
      const refreshed = await supabaseAdmin
        .from("meta_conversation_management")
        .select("conversation_id, status, assigned_user_id, assigned_department, updated_at")
        .eq("connection_id", connectionId)
        .order("updated_at", { ascending: false })

      if (!refreshed.error) {
        managementRows = refreshed.data ?? managementRows
      }
    }

    const latestManagementByConversation = new Map<
      string,
      { status: string; assigned_user_id: string | null; assigned_department: string | null }
    >()

    for (const row of managementRows ?? []) {
      const conversationId = String(row.conversation_id)
      if (!latestManagementByConversation.has(conversationId)) {
        latestManagementByConversation.set(conversationId, {
          status: String(row.status || "open"),
          assigned_user_id: row.assigned_user_id ? String(row.assigned_user_id) : null,
          assigned_department: row.assigned_department ? String(row.assigned_department) : null
        })
      }
    }

    const reminderByConversation = new Map<string, { scheduled_for: string; description: string }>()
    for (const row of reminderRows) {
      reminderByConversation.set(String(row.conversation_id), {
        scheduled_for: String(row.scheduled_for),
        description: String(row.description || "")
      })
    }

    const conversationsWithServiceState = (data ?? []).map((conversation) => {
      const conversationId = String(conversation.id)
      const management = latestManagementByConversation.get(conversationId)

      const isClosed = management?.status === "closed"
      const hasOperator = Boolean(management?.assigned_user_id)

      const service_state = isClosed ? "closed" : hasOperator ? "operator" : "bot"

      const lastInboundAt = latestInboundByConversation.get(conversationId) ?? null
      const lastOutboundAt = latestOutboundByConversation.get(conversationId) ?? null

      const inboundDate = lastInboundAt ? new Date(lastInboundAt) : null
      const outboundDate = lastOutboundAt ? new Date(lastOutboundAt) : null
      const waitingForReply =
        Boolean(inboundDate) && (!outboundDate || (inboundDate as Date).getTime() > (outboundDate as Date).getTime())

      const minutesWithoutReply = waitingForReply && inboundDate
        ? Math.max(0, Math.floor((Date.now() - inboundDate.getTime()) / 60000))
        : null

      const responseAlertLevel =
        alertsEnabled &&
        service_state === "operator" &&
        minutesWithoutReply !== null &&
        minutesWithoutReply >= dangerMinutes
          ? "danger"
          : alertsEnabled &&
              service_state === "operator" &&
              minutesWithoutReply !== null &&
              minutesWithoutReply >= warningMinutes
            ? "warning"
            : null

      const reminder = reminderByConversation.get(conversationId)

      return {
        ...conversation,
        service_state,
        assigned_user_id: management?.assigned_user_id ?? null,
        waiting_for_reply: waitingForReply,
        minutes_without_reply: minutesWithoutReply,
        response_alert_level: responseAlertLevel,
        reminder_due_at: reminder?.scheduled_for ?? null,
        reminder_description: reminder?.description ?? null
      }
    })

    const visibleConversations =
      userId && !isDiretoria
        ? conversationsWithServiceState.filter((conversation) => {
            if (conversation.service_state === "bot") return true
            if (conversation.service_state === "closed") return true
            return String(conversation.assigned_user_id || "") === userId
          })
        : conversationsWithServiceState

    return NextResponse.json({
      ok: true,
      data: visibleConversations
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao listar conversas'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
