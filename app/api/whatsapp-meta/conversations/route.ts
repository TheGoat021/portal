// app/api/whatsapp-meta/conversations/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function parseRawPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch {}
  }
  return null
}

function isOperatorOutbound(rawPayload: unknown) {
  const parsed = parseRawPayload(rawPayload)
  if (!parsed) return false

  const directAgentId = String(parsed.agentId ?? parsed.agent_id ?? '').trim()
  const directAgentEmail = String(parsed.agentEmail ?? parsed.agent_email ?? '').trim()
  if (directAgentId || directAgentEmail) return true

  const nestedSend =
    parsed.send && typeof parsed.send === 'object'
      ? (parsed.send as Record<string, unknown>)
      : null

  const nestedAgentId = nestedSend ? String(nestedSend.agentId ?? nestedSend.agent_id ?? '').trim() : ''
  const nestedAgentEmail = nestedSend ? String(nestedSend.agentEmail ?? nestedSend.agent_email ?? '').trim() : ''
  return Boolean(nestedAgentId || nestedAgentEmail)
}

function chunkArray<T>(items: T[], size: number) {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const connectionId = url.searchParams.get('connectionId')
    const search = url.searchParams.get('search')?.trim() || ''
    const serviceFilterRaw = (url.searchParams.get('serviceFilter') || '').trim().toLowerCase()
    const serviceFilter =
      serviceFilterRaw === 'bot' || serviceFilterRaw === 'operator' || serviceFilterRaw === 'closed'
        ? serviceFilterRaw
        : null
    const limitParam = Number.parseInt(url.searchParams.get('limit') || '50', 10)
    const offsetParam = Number.parseInt(url.searchParams.get('offset') || '0', 10)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0
    const userId = url.searchParams.get('userId')?.trim() || ''
    const userRole = (url.searchParams.get('userRole')?.trim() || '').toUpperCase()
    const isDiretoria =
      userRole === 'DIRETORIA' ||
      userRole === 'ADMINISTRAÇÃO' ||
      userRole === 'ADMINISTRACAO' ||
      userRole === 'ADMIN'

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId é obrigatório' }, { status: 400 })
    }

    const IN_FILTER_CHUNK_SIZE = 50

    let query = supabaseAdmin
      .from('meta_conversations')
      .select('*')
      .eq('connection_id', connectionId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(3000)

    if (search) {
      query = query.or(
        `wa_id.ilike.%${search}%,contact_name.ilike.%${search}%,profile_name.ilike.%${search}%,last_message.ilike.%${search}%`
      )
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const conversationIds = (data ?? []).map((conversation) => String(conversation.id))

    const managementRows: Array<{
      conversation_id: string
      status: string | null
      assigned_user_id: string | null
      assigned_user_email: string | null
      assigned_department: string | null
      updated_at: string | null
    }> = []

    if (conversationIds.length > 0) {
      const idChunks = chunkArray(conversationIds, IN_FILTER_CHUNK_SIZE)
      for (const chunk of idChunks) {
        const managementResponse = await supabaseAdmin
          .from('meta_conversation_management')
          .select('conversation_id, status, assigned_user_id, assigned_user_email, assigned_department, updated_at')
          .eq('connection_id', connectionId)
          .in('conversation_id', chunk)
          .order('updated_at', { ascending: false })

        if (managementResponse.error) {
          return NextResponse.json({ error: managementResponse.error.message }, { status: 500 })
        }

        managementRows.push(
          ...((managementResponse.data ?? []) as Array<{
            conversation_id: string
            status: string | null
            assigned_user_id: string | null
            assigned_user_email: string | null
            assigned_department: string | null
            updated_at: string | null
          }>)
        )
      }
    }

    const { data: queueSettings } = await supabaseAdmin
      .from('meta_queue_settings')
      .select('response_alerts_enabled, response_alert_warning_minutes, response_alert_danger_minutes')
      .eq('connection_id', connectionId)
      .maybeSingle()

    const { data: reminderRowsRaw, error: reminderRowsError } = await supabaseAdmin
      .from('meta_conversation_reminders')
      .select('conversation_id, scheduled_for, description')
      .eq('connection_id', connectionId)
      .is('completed_at', null)

    const reminderTableMissing =
      reminderRowsError && /meta_conversation_reminders/i.test(reminderRowsError.message || '')

    if (reminderRowsError && !reminderTableMissing) {
      return NextResponse.json({ error: reminderRowsError.message }, { status: 500 })
    }

    const reminderRows = reminderTableMissing ? [] : reminderRowsRaw ?? []

    const alertsEnabled = Boolean(queueSettings?.response_alerts_enabled)
    const warningMinutes = Number(queueSettings?.response_alert_warning_minutes ?? 10)
    const dangerMinutes = Number(queueSettings?.response_alert_danger_minutes ?? 30)

    const latestInboundByConversation = new Map<string, string>()
    const latestOutboundByConversation = new Map<string, string>()
    const latestOperatorEmailByConversation = new Map<string, string>()

    if (conversationIds.length > 0) {
      const idChunks = chunkArray(conversationIds, IN_FILTER_CHUNK_SIZE)
      for (const chunk of idChunks) {
        const [{ data: inboundRows, error: inboundError }, { data: outboundRowsRaw, error: outboundError }] =
          await Promise.all([
            supabaseAdmin
              .from('meta_messages')
              .select('conversation_id, created_at')
              .in('conversation_id', chunk)
              .eq('direction', 'inbound')
              .order('created_at', { ascending: false }),
            supabaseAdmin
              .from('meta_messages')
              .select('conversation_id, created_at, raw_payload')
              .in('conversation_id', chunk)
              .eq('direction', 'outbound')
              .neq('type', 'system')
              .order('created_at', { ascending: false })
          ])

        if (inboundError) {
          return NextResponse.json({ error: inboundError.message }, { status: 500 })
        }
        if (outboundError) {
          return NextResponse.json({ error: outboundError.message }, { status: 500 })
        }

        for (const row of inboundRows ?? []) {
          const conversationId = String(row.conversation_id)
          if (!latestInboundByConversation.has(conversationId)) {
            latestInboundByConversation.set(conversationId, String(row.created_at))
          }
        }

        for (const row of outboundRowsRaw ?? []) {
          if (!isOperatorOutbound((row as { raw_payload?: unknown }).raw_payload)) continue

          const conversationId = String(row.conversation_id)
          if (!latestOutboundByConversation.has(conversationId)) {
            latestOutboundByConversation.set(conversationId, String(row.created_at))
          }

          if (!latestOperatorEmailByConversation.has(conversationId)) {
            const parsed = parseRawPayload((row as { raw_payload?: unknown }).raw_payload)
            const directEmail = String(parsed?.agentEmail ?? parsed?.agent_email ?? '').trim()
            const nestedSend =
              parsed?.send && typeof parsed.send === 'object'
                ? (parsed.send as Record<string, unknown>)
                : null
            const nestedEmail = String(nestedSend?.agentEmail ?? nestedSend?.agent_email ?? '').trim()
            const agentEmail = directEmail || nestedEmail
            if (agentEmail) {
              latestOperatorEmailByConversation.set(conversationId, agentEmail)
            }
          }
        }
      }
    }

    const latestManagementByConversation = new Map<
      string,
      { status: string; assigned_user_id: string | null; assigned_user_email: string | null; assigned_department: string | null }
    >()

    for (const row of managementRows ?? []) {
      const conversationId = String(row.conversation_id)
      if (!latestManagementByConversation.has(conversationId)) {
        latestManagementByConversation.set(conversationId, {
          status: String(row.status || 'open'),
          assigned_user_id: row.assigned_user_id ? String(row.assigned_user_id) : null,
          assigned_user_email: row.assigned_user_email ? String(row.assigned_user_email) : null,
          assigned_department: row.assigned_department ? String(row.assigned_department) : null
        })
      }
    }

    const reminderByConversation = new Map<string, { scheduled_for: string; description: string }>()
    for (const row of reminderRows) {
      reminderByConversation.set(String(row.conversation_id), {
        scheduled_for: String(row.scheduled_for),
        description: String(row.description || '')
      })
    }

    const conversationsWithServiceState = (data ?? []).map((conversation) => {
      const conversationId = String(conversation.id)
      const management = latestManagementByConversation.get(conversationId)
      const fallbackAgentEmail = latestOperatorEmailByConversation.get(conversationId) ?? null

      const isClosed = management?.status === 'closed'
      // Regra de negocio: "em atendimento" apenas quando houver operador atribuido.
      // Bot fica somente para entrada/fila sem atribuicao.
      const hasOperator = Boolean(
        management?.assigned_user_id ||
          management?.assigned_user_email
      )
      const service_state = isClosed ? 'closed' : hasOperator ? 'operator' : 'bot'

      const lastInboundAt = latestInboundByConversation.get(conversationId) ?? null
      const lastOutboundAt = latestOutboundByConversation.get(conversationId) ?? null

      const inboundDate = lastInboundAt ? new Date(lastInboundAt) : null
      const outboundDate = lastOutboundAt ? new Date(lastOutboundAt) : null
      const waitingForReply =
        Boolean(inboundDate) && (!outboundDate || (inboundDate as Date).getTime() > (outboundDate as Date).getTime())

      const minutesWithoutReply =
        waitingForReply && inboundDate
          ? Math.max(0, Math.floor((Date.now() - inboundDate.getTime()) / 60000))
          : null

      const responseAlertLevel =
        alertsEnabled &&
        service_state === 'operator' &&
        minutesWithoutReply !== null &&
        minutesWithoutReply >= dangerMinutes
          ? 'danger'
          : alertsEnabled &&
              service_state === 'operator' &&
              minutesWithoutReply !== null &&
              minutesWithoutReply >= warningMinutes
            ? 'warning'
            : null

      const reminder = reminderByConversation.get(conversationId)

      return {
        ...conversation,
        service_state,
        assigned_user_id: management?.assigned_user_id ?? null,
        assigned_user_email: management?.assigned_user_email ?? fallbackAgentEmail,
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
            if (conversation.service_state === 'bot') return true
            if (conversation.service_state === 'closed') return true
            return String(conversation.assigned_user_id || '') === userId
          })
        : conversationsWithServiceState

    const counts = {
      bot: visibleConversations.filter((conversation) => conversation.service_state === 'bot').length,
      operator: visibleConversations.filter((conversation) => conversation.service_state === 'operator').length,
      closed: visibleConversations.filter((conversation) => conversation.service_state === 'closed').length
    }

    const conversationsByFilter = serviceFilter
      ? visibleConversations.filter((conversation) => conversation.service_state === serviceFilter)
      : visibleConversations

    const total = conversationsByFilter.length
    const pagedData = conversationsByFilter.slice(offset, offset + limit)

    return NextResponse.json({
      ok: true,
      data: pagedData,
      counts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + pagedData.length < total
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao listar conversas'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

