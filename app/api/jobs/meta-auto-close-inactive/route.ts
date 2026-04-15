import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { upsertMetaConversationManagement } from "@/lib/metaConversationManagement"

export const runtime = "nodejs"

function isAuthorized(req: NextRequest) {
  const cronHeader = req.headers.get("x-vercel-cron")
  if (cronHeader) return true

  const bearer = req.headers.get("authorization") || ""
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : ""
  return Boolean(process.env.CRON_SECRET && token && token === process.env.CRON_SECRET)
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data: settingsRows, error: settingsError } = await supabaseAdmin
      .from("meta_queue_settings")
      .select("connection_id, auto_close_inactive_enabled, inactive_close_minutes")
      .eq("auto_close_inactive_enabled", true)

    if (settingsError) {
      return NextResponse.json({ ok: false, error: settingsError.message }, { status: 500 })
    }

    let scanned = 0
    let closed = 0

    for (const row of settingsRows ?? []) {
      const connectionId = String(row.connection_id)
      const minutes = Number(row.inactive_close_minutes ?? 0)
      if (!connectionId || minutes <= 0) continue

      const thresholdIso = new Date(Date.now() - minutes * 60 * 1000).toISOString()

      const { data: staleConversations, error: staleError } = await supabaseAdmin
        .from("meta_conversations")
        .select("id, connection_id, last_message_at")
        .eq("connection_id", connectionId)
        .not("last_message_at", "is", null)
        .lt("last_message_at", thresholdIso)

      if (staleError) {
        console.error("AUTO-CLOSE META erro ao buscar conversas inativas:", staleError)
        continue
      }

      const staleIds = (staleConversations ?? []).map((item) => String(item.id))
      if (!staleIds.length) continue

      scanned += staleIds.length

      const { data: managementRows, error: managementError } = await supabaseAdmin
        .from("meta_conversation_management")
        .select("conversation_id, status, assigned_user_id, assigned_user_email, assigned_department")
        .eq("connection_id", connectionId)
        .in("conversation_id", staleIds)

      if (managementError) {
        console.error("AUTO-CLOSE META erro ao buscar gestao:", managementError)
        continue
      }

      const managementByConversation = new Map<
        string,
        {
          status: string
          assigned_user_id: string | null
          assigned_user_email: string | null
          assigned_department: string | null
        }
      >()

      for (const item of managementRows ?? []) {
        const conversationId = String(item.conversation_id)
        if (!managementByConversation.has(conversationId)) {
          managementByConversation.set(conversationId, {
            status: String(item.status || "open"),
            assigned_user_id: item.assigned_user_id ? String(item.assigned_user_id) : null,
            assigned_user_email: item.assigned_user_email ? String(item.assigned_user_email) : null,
            assigned_department: item.assigned_department ? String(item.assigned_department) : null
          })
        }
      }

      for (const conversationId of staleIds) {
        const current = managementByConversation.get(conversationId)
        if (current?.status === "closed") continue

        await upsertMetaConversationManagement({
          conversation_id: conversationId,
          connection_id: connectionId,
          status: "closed",
          assigned_user_id: current?.assigned_user_id ?? null,
          assigned_user_email: current?.assigned_user_email ?? null,
          assigned_department: current?.assigned_department ?? null,
          closed_at: new Date().toISOString(),
          closed_by_user_id: null
        })
        closed += 1
      }
    }

    return NextResponse.json({
      ok: true,
      scanned,
      closed
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro no auto-close de inatividade"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
