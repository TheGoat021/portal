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
  const { data, error } = await supabaseAdmin
    .from("meta_conversation_management")
    .upsert(
      {
        ...payload,
        updated_at: new Date().toISOString()
      },
      { onConflict: "conversation_id" }
    )
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as MetaConversationManagement
}

