import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "conversationId é obrigatório" },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("meta_conversations")
      .update({
        unread_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Erro ao marcar conversa como lida" },
      { status: 500 }
    )
  }
}