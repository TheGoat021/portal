import { supabaseAdmin } from "@/lib/supabaseAdmin"

export type MetaConversationManagement = {
  conversation_id: string
  connection_id: string
  status: "open" | "closed"
  assigned_user_id: string | null
  assigned_user_email: string | null
  assigned_department: string | null
  closed_by_user_id: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export async function getMetaConversationManagement(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("meta_conversation_management")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as MetaConversationManagement | null
}

export async function upsertMetaConversationManagement(
  payload: Partial<MetaConversationManagement> & {
    conversation_id: string
    connection_id: string
  }
) {
  const existing = await getMetaConversationManagement(payload.conversation_id)
  const updatedAt = new Date().toISOString()

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from("meta_conversation_management")
      .update({
        ...payload,
        updated_at: updatedAt
      })
      .eq("conversation_id", payload.conversation_id)

    if (updateError) throw new Error(updateError.message)

    const refreshed = await getMetaConversationManagement(payload.conversation_id)
    if (!refreshed) throw new Error("Falha ao atualizar gestão da conversa Meta")
    return refreshed
  }

  const { data, error } = await supabaseAdmin
    .from("meta_conversation_management")
    .insert({
      ...payload,
      updated_at: updatedAt
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as MetaConversationManagement
}
