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

    const formatted = (data ?? []).map((conv) => ({
      id: conv.id,
      phone: conv.phone ?? "",
      name: conv.name ?? conv.phone ?? "Sem nome",
      lastMessage: conv.last_message ?? "",
      lastMessageAt: conv.last_message_at ?? null,
      agentId: conv.agent_id ?? null,
      agentName: conv.agent_name ?? null
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Erro em /api/conversations:", error)

    return NextResponse.json(
      { error: "Erro interno ao buscar conversas" },
      { status: 500 }
    )
  }
}