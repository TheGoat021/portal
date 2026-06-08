import { NextRequest, NextResponse } from "next/server"
import ffmpeg from "fluent-ffmpeg"
import ffmpegStatic from "ffmpeg-static"
import fs from "fs/promises"
import fsSync from "fs"
import os from "os"
import path from "path"
import { uploadVoiceQueueGreeting } from "@/lib/voiceStorage"

export const runtime = "nodejs"

async function convertAudioToWave(fileBuffer: Buffer, originalName: string) {
  const fromPackage = typeof ffmpegStatic === "string" ? ffmpegStatic : ""
  const candidates = [
    fromPackage,
    fromPackage.replace(/^\/root\//i, "/var/task/"),
    fromPackage.replace(/^\/ROOT\//, "/var/task/"),
    path.join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
    "/var/task/node_modules/ffmpeg-static/ffmpeg"
  ].filter(Boolean)

  const ffmpegPath = candidates.find((candidate) => fsSync.existsSync(candidate)) || ""
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static nao encontrado para conversao de audio")
  }

  ffmpeg.setFfmpegPath(ffmpegPath)

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-queue-audio-"))
  const safeName = (originalName || `audio-${Date.now()}.tmp`).replace(/[^\w.\-]/g, "_")
  const inputPath = path.join(tmpDir, safeName)
  const outputPath = path.join(tmpDir, `${Date.now()}-queue-greeting.wav`)

  await fs.writeFile(inputPath, fileBuffer)

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("pcm_s16le")
        .audioChannels(1)
        .audioFrequency(8000)
        .format("wav")
        .save(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
    })

    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const queueSlug = String(form.get("queueSlug") || "").trim()
    const file = form.get("file") as File | null

    if (!queueSlug) {
      return NextResponse.json({ error: "queueSlug e obrigatorio." }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: "file e obrigatorio." }, { status: 400 })
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer())
    const waveBuffer = await convertAudioToWave(rawBuffer, file.name || "queue-greeting")
    const uploaded = await uploadVoiceQueueGreeting({
      fileBuffer: waveBuffer,
      fileName: file.name || "queue-greeting.wav",
      queueSlug
    })

    return NextResponse.json(uploaded)
  } catch (error) {
    console.error("Erro ao subir audio da fila:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao subir audio da fila." },
      { status: 500 }
    )
  }
}
