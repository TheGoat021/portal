import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  const { data } = await supabaseAdmin
    .from("arena_chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30)

  return NextResponse.json(data || [])
}