import path from "node:path"
import { env } from "../env.js"
import { supabaseAdmin } from "../supabase.js"

function publicRecordingUrl(filePath: string) {
  const cleanBase = env.recordingsPublicBaseUrl.replace(/\/$/, "")
  const fileName = path.basename(filePath)
  return `${cleanBase}/${encodeURIComponent(fileName)}`
}

export async function createRecording(input: {
  callId: string
  filePath: string
  durationSeconds?: number | null
  publicUrl?: string | null
}) {
  const publicUrl = input.publicUrl || publicRecordingUrl(input.filePath)

  const { data, error } = await supabaseAdmin
    .from("voice_recordings")
    .insert({
      call_id: input.callId,
      file_path: input.filePath,
      public_url: publicUrl,
      duration_seconds: input.durationSeconds ?? null
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to create recording: ${error.message}`)
  }

  await supabaseAdmin
    .from("voice_calls")
    .update({
      recording_url: publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.callId)

  return data
}
