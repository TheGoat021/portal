import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const DEFAULT_VOICE_BUCKET = "voice-assets"

function getVoiceBucketName() {
  return process.env.VOICE_MEDIA_BUCKET || DEFAULT_VOICE_BUCKET
}

export async function uploadVoiceQueueGreeting(input: {
  fileBuffer: Buffer
  fileName: string
  queueSlug: string
}) {
  const bucketName = getVoiceBucketName()
  const hash = crypto.createHash("sha256").update(input.fileBuffer).digest("hex")
  const safeSlug = input.queueSlug.replace(/[^a-z0-9-_]/gi, "-").toLowerCase() || "queue"
  const filePath = `voice/queues/${safeSlug}/greeting-${hash.slice(0, 12)}.wav`

  let { error } = await supabaseAdmin.storage.from(bucketName).upload(filePath, input.fileBuffer, {
    contentType: "audio/wav",
    upsert: true
  })

  if (error && /bucket not found/i.test(error.message)) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true
    })

    if (!createError) {
      const retry = await supabaseAdmin.storage.from(bucketName).upload(filePath, input.fileBuffer, {
        contentType: "audio/wav",
        upsert: true
      })

      error = retry.error
    }
  }

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath)

  return {
    publicUrl: data.publicUrl,
    fileName: input.fileName.replace(/\.[^.]+$/, "") + ".wav"
  }
}
