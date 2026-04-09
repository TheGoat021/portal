import { supabaseAdmin } from "@/lib/supabaseAdmin"

export type ConversationManagement = {
  conversation_id: string
  status: "open" | "closed"
  closed_by_user_id: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export async function getConversationManagement(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("conversation_management")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as ConversationManagement | null
}

export async function upsertConversationManagement(
  payload: Partial<ConversationManagement> & { conversation_id: string }
) {
  const existing = await getConversationManagement(payload.conversation_id)
  const updatedAt = new Date().toISOString()

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from("conversation_management")
      .update({
        ...payload,
        updated_at: updatedAt
      })
      .eq("conversation_id", payload.conversation_id)

    if (updateError) throw new Error(updateError.message)

    const refreshed = await getConversationManagement(payload.conversation_id)
    if (!refreshed) throw new Error("Falha ao atualizar gestão da conversa")
    return refreshed
  }

  const { data, error } = await supabaseAdmin
    .from("conversation_management")
    .insert({
      ...payload,
      updated_at: updatedAt
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as ConversationManagement
}
