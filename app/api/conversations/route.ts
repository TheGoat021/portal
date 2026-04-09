import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select(`
        id,
        phone,
        name,
        last_message,
        last_message_at,
        last_message_type,
        agent_id,
        agent_name
      `)
      .order("last_message_at", { ascending: false, nullsFirst: false })

    if (error) {
      console.error("Erro ao buscar conversas no Supabase:", error)
      return NextResponse.json(
        { error: "Erro ao buscar conversas" },
        { status: 500 }
      )
    }

    const { data: managementRows, error: managementRowsError } = await supabaseAdmin
      .from("conversation_management")
      .select("conversation_id, status, updated_at")
      .order("updated_at", { ascending: false })

    const isMissingManagementTable =
      (managementRowsError as { code?: string } | null)?.code === "42P01"

    if (managementRowsError && !isMissingManagementTable) {
      console.error("Erro ao buscar gestão de conversas:", managementRowsError)
      return NextResponse.json(
        { error: "Erro ao buscar status das conversas" },
        { status: 500 }
      )
    }

    const latestStatusByConversation = new Map<string, string>()
    for (const row of managementRows ?? []) {
      const conversationId = String(row.conversation_id)
      if (!latestStatusByConversation.has(conversationId)) {
        latestStatusByConversation.set(conversationId, String(row.status || "open"))
      }
    }

    const formatted = (data ?? []).map((conv) => {
      const serviceState =
        latestStatusByConversation.get(String(conv.id)) === "closed"
          ? "closed"
          : "open"

      return {
      id: conv.id,
      phone: conv.phone ?? "",
      name: conv.name ?? conv.phone ?? "Sem nome",
      lastMessage: conv.last_message ?? "",
      lastMessageAt: conv.last_message_at ?? null,
      lastMessageType: conv.last_message_type ?? "text",
      agentId: conv.agent_id ?? null,
      agentName: conv.agent_name ?? null,
      serviceState
    }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Erro em /api/conversations:", error)

    return NextResponse.json(
      { error: "Erro interno ao buscar conversas" },
      { status: 500 }
    )
  }
}
