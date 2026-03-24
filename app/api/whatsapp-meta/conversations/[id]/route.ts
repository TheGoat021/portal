// app/api/whatsapp-meta/conversations/[id]/route.ts

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
      .from("meta_conversations")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      data
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Erro ao buscar conversa meta" },
      { status: 500 }
    )
  }
}