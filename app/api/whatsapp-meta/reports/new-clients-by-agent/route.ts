import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type ConversationRow = {
  id: string
  created_at: string | null
}

type MessageRow = {
  conversation_id: string
  created_at: string | null
  raw_payload: unknown
}

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

function getAgentFromRawPayload(raw: unknown) {
  const parsed = parseRawPayload(raw)
  if (!parsed) return { agentId: "", agentEmail: "" }

  const directId = String(parsed.agentId ?? parsed.agent_id ?? "").trim()
  const directEmail = String(parsed.agentEmail ?? parsed.agent_email ?? "").trim().toLowerCase()

  const nestedSend =
    parsed.send && typeof parsed.send === "object"
      ? (parsed.send as Record<string, unknown>)
      : null

  const nestedId = String(nestedSend?.agentId ?? nestedSend?.agent_id ?? "").trim()
  const nestedEmail = String(nestedSend?.agentEmail ?? nestedSend?.agent_email ?? "").trim().toLowerCase()

  return {
    agentId: directId || nestedId,
    agentEmail: directEmail || nestedEmail
  }
}

function chunkArray<T>(items: T[], size: number) {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function toDateRange(startDate: string, endDate: string) {
  const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString()
  const end = new Date(`${endDate}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  const endIsoExclusive = end.toISOString()
  return { startIso, endIsoExclusive }
}

async function fetchAllConversationsInRange(connectionId: string, startIso: string, endIsoExclusive: string) {
  const pageSize = 1000
  let from = 0
  let hasMore = true
  const rows: ConversationRow[] = []

  while (hasMore) {
    const to = from + pageSize - 1
    const { data, error } = await supabaseAdmin
      .from("meta_conversations")
      .select("id, created_at")
      .eq("connection_id", connectionId)
      .gte("created_at", startIso)
      .lt("created_at", endIsoExclusive)
      .order("created_at", { ascending: true })
      .range(from, to)

    if (error) throw new Error(error.message)

    const batch = (data ?? []) as ConversationRow[]
    rows.push(...batch)
    hasMore = batch.length === pageSize
    from += pageSize
  }

  return rows
}

async function fetchAllOutboundMessagesByConversationChunk(conversationIds: string[]) {
  const pageSize = 1000
  let from = 0
  let hasMore = true
  const rows: MessageRow[] = []

  while (hasMore) {
    const to = from + pageSize - 1
    const { data, error } = await supabaseAdmin
      .from("meta_messages")
      .select("conversation_id, created_at, raw_payload")
      .in("conversation_id", conversationIds)
      .eq("direction", "outbound")
      .neq("type", "system")
      .order("created_at", { ascending: true })
      .range(from, to)

    if (error) throw new Error(error.message)

    const batch = (data ?? []) as MessageRow[]
    rows.push(...batch)
    hasMore = batch.length === pageSize
    from += pageSize
  }

  return rows
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const connectionId = String(searchParams.get("connectionId") || "").trim()
    const startDate = String(searchParams.get("startDate") || "").trim()
    const endDate = String(searchParams.get("endDate") || "").trim()

    if (!connectionId) {
      return NextResponse.json({ ok: false, error: "connectionId é obrigatório" }, { status: 400 })
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ ok: false, error: "startDate e endDate são obrigatórios" }, { status: 400 })
    }

    const { startIso, endIsoExclusive } = toDateRange(startDate, endDate)

    const conversationRows = await fetchAllConversationsInRange(connectionId, startIso, endIsoExclusive)
    const conversationIds = conversationRows.map((row) => String(row.id))

    const firstOperatorByConversation = new Map<
      string,
      { agentId: string; agentEmail: string; firstResponseAt: string | null }
    >()

    if (conversationIds.length > 0) {
      const chunks = chunkArray(conversationIds, 50)
      for (const chunk of chunks) {
        const outboundRows = await fetchAllOutboundMessagesByConversationChunk(chunk)
        for (const row of outboundRows) {
          const conversationId = String(row.conversation_id)
          if (firstOperatorByConversation.has(conversationId)) continue

          const { agentId, agentEmail } = getAgentFromRawPayload(row.raw_payload)
          if (!agentId && !agentEmail) continue

          firstOperatorByConversation.set(conversationId, {
            agentId,
            agentEmail,
            firstResponseAt: row.created_at ?? null
          })
        }
      }
    }

    const byAgent = new Map<
      string,
      {
        agent_id: string | null
        agent_email: string
        novos_clientes: number
      }
    >()

    let semAtendente = 0

    for (const conversation of conversationRows) {
      const firstOperator = firstOperatorByConversation.get(String(conversation.id))
      if (!firstOperator) {
        semAtendente += 1
        continue
      }

      const key = (firstOperator.agentEmail || firstOperator.agentId || "sem_identificacao").toLowerCase()
      if (!byAgent.has(key)) {
        byAgent.set(key, {
          agent_id: firstOperator.agentId || null,
          agent_email: firstOperator.agentEmail || firstOperator.agentId || "Sem identificação",
          novos_clientes: 0
        })
      }

      const item = byAgent.get(key)!
      item.novos_clientes += 1
    }

    const rows = Array.from(byAgent.values()).sort((a, b) => b.novos_clientes - a.novos_clientes)

    return NextResponse.json({
      ok: true,
      data: {
        connectionId,
        startDate,
        endDate,
        total_novos_clientes: conversationRows.length,
        total_sem_atendente: semAtendente,
        rows
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar relatório de atendimento"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
