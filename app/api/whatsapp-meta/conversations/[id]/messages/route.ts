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
        file_name,
        raw_payload
      `)
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    const mapped = (data ?? []).map((item) => {
      const rawPayloadUnknown = (item as { raw_payload?: unknown })?.raw_payload
      let parsedPayload: Record<string, unknown> | null = null

      if (rawPayloadUnknown && typeof rawPayloadUnknown === "object") {
        parsedPayload = rawPayloadUnknown as Record<string, unknown>
      } else if (typeof rawPayloadUnknown === "string") {
        try {
          const obj = JSON.parse(rawPayloadUnknown)
          if (obj && typeof obj === "object") {
            parsedPayload = obj as Record<string, unknown>
          }
        } catch {}
      }

      const nestedSend =
        parsedPayload && typeof parsedPayload.send === "object"
          ? (parsedPayload.send as Record<string, unknown>)
          : null

      const agentFromPayload =
        parsedPayload
          ? String(parsedPayload.agentEmail ?? parsedPayload.agent_email ?? "")
          : ""
      const agentFromSend =
        nestedSend
          ? String(nestedSend.agentEmail ?? nestedSend.agent_email ?? "")
          : ""

      const agentEmail =
        (agentFromPayload || "").trim() ||
        (agentFromSend || "").trim() ||
        null

      return {
        ...item,
        agent_email: agentEmail
      }
    })

    return NextResponse.json({
      ok: true,
      data: mapped
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Erro ao buscar mensagens da conversa" },
      { status: 500 }
    )
  }
}
