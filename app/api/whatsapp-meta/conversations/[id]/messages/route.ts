import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "conversationId é obrigatório" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("meta_messages")
      .select(`
        id,
        message,
        direction,
        created_at,
        type,
        media_url,
        status,
        caption,
        context_message_id,
        meta_message_id,
        mime_type,
        file_name
      `)
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: data ?? []
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Erro ao buscar mensagens da conversa" },
      { status: 500 }
    )
  }
}