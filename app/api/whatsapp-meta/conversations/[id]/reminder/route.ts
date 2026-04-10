import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

async function getConversationMeta(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("meta_conversations")
    .select("id, connection_id")
    .eq("id", conversationId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId e obrigatorio" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("meta_conversation_reminders")
      .select("*")
      .eq("conversation_id", conversationId)
      .is("completed_at", null)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: data ?? null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar lembrete"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    const body = await req.json().catch(() => null)
    const scheduledFor = String(body?.scheduledFor || "")
    const description = String(body?.description || "").trim()
    const userId = String(body?.userId || "") || null
    const userEmail = String(body?.userEmail || "") || null

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId e obrigatorio" }, { status: 400 })
    }
    if (!scheduledFor || Number.isNaN(Date.parse(scheduledFor))) {
      return NextResponse.json({ ok: false, error: "Data/hora invalida" }, { status: 400 })
    }
    if (!description) {
      return NextResponse.json({ ok: false, error: "Descricao obrigatoria" }, { status: 400 })
    }

    const conversation = await getConversationMeta(conversationId)
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from("meta_conversation_reminders")
      .upsert(
        {
          conversation_id: conversationId,
          connection_id: conversation.connection_id,
          scheduled_for: new Date(scheduledFor).toISOString(),
          description,
          created_by_user_id: userId,
          created_by_user_email: userEmail,
          completed_at: null,
          completed_by_user_id: null,
          updated_at: now
        },
        { onConflict: "conversation_id" }
      )
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao salvar lembrete"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    const body = await req.json().catch(() => null)
    const userId = String(body?.userId || "") || null

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId e obrigatorio" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("meta_conversation_reminders")
      .update({
        completed_at: new Date().toISOString(),
        completed_by_user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq("conversation_id", conversationId)
      .is("completed_at", null)
      .select("*")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: data ?? null })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao concluir lembrete"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
