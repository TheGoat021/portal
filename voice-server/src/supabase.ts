import { createClient } from "@supabase/supabase-js"
import WebSocket from "ws"
import { env } from "./env.js"

export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    realtime: {
      transport: WebSocket as any
    }
  }
)
