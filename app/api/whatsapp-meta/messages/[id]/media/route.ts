import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { downloadMediaFile, getMediaInfo } from "@/lib/whatsappMeta"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "messageId é obrigatório" },
        { status: 400 }
      )
    }

    const { data: message, error: messageError } = await supabaseAdmin
      .from("meta_messages")
      .select("id, connection_id, media_id, mime_type, file_name")
      .eq("id", id)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { ok: false, error: messageError?.message || "Mensagem não encontrada" },
        { status: 404 }
      )
    }

    if (!message.media_id) {
      return NextResponse.json(
        { ok: false, error: "Mensagem não possui mídia" },
        { status: 404 }
      )
    }

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("whatsapp_meta_connections")
      .select("id, business_token")
      .eq("id", message.connection_id)
      .single()

    if (connectionError || !connection?.business_token) {
      return NextResponse.json(
        { ok: false, error: connectionError?.message || "Conexão inválida" },
        { status: 400 }
      )
    }

    const mediaInfo = await getMediaInfo(message.media_id, connection.business_token)
    const buffer = await downloadMediaFile(mediaInfo.url, connection.business_token)

    const mimeType =
      message.mime_type ||
      mediaInfo.mime_type ||
      "application/octet-stream"

    const fileName = sanitizeFileName(message.file_name || `${message.media_id}`)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename=\"${fileName}\"`
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao obter mídia"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
