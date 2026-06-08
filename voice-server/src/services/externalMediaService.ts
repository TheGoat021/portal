import dgram from "node:dgram"
import fs from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { env } from "../env.js"
import { logger } from "../utils/logger.js"

type ExternalMediaPlayback = {
  id: string
  port: number
  format: "alaw"
  socket: dgram.Socket
  audioFrames: Buffer[]
  remote?: {
    address: string
    port: number
  }
  streamTimer: NodeJS.Timeout | null
  sequence: number
  timestamp: number
  ssrc: number
  frameIndex: number
}

const FRAME_SIZE = 160
const FRAME_INTERVAL_MS = 20
const playbacks = new Map<string, ExternalMediaPlayback>()
let nextPort = env.asterisk.externalMediaStartPort

function allocatePort() {
  const port = nextPort
  nextPort += 2
  return port
}

function splitAudioFrames(buffer: Buffer) {
  const frames: Buffer[] = []

  for (let index = 0; index < buffer.length; index += FRAME_SIZE) {
    const chunk = buffer.subarray(index, Math.min(index + FRAME_SIZE, buffer.length))
    if (chunk.length === FRAME_SIZE) {
      frames.push(chunk)
    }
  }

  return frames
}

function buildRtpPacket(playback: ExternalMediaPlayback, payload: Buffer) {
  const packet = Buffer.alloc(12 + payload.length)

  packet[0] = 0x80
  packet[1] = 8
  packet.writeUInt16BE(playback.sequence & 0xffff, 2)
  packet.writeUInt32BE(playback.timestamp >>> 0, 4)
  packet.writeUInt32BE(playback.ssrc >>> 0, 8)
  payload.copy(packet, 12)

  playback.sequence = (playback.sequence + 1) & 0xffff
  playback.timestamp = (playback.timestamp + payload.length) >>> 0

  return packet
}

function startStreaming(playback: ExternalMediaPlayback) {
  if (!playback.remote || playback.streamTimer || playback.audioFrames.length === 0) {
    return
  }

  logger.info("Starting RTP stream for external media", {
    playbackId: playback.id,
    remoteAddress: playback.remote.address,
    remotePort: playback.remote.port,
    frameCount: playback.audioFrames.length
  })

  playback.streamTimer = setInterval(() => {
    if (!playback.remote) return

    if (playback.frameIndex >= playback.audioFrames.length) {
      stopExternalMediaPlayback(playback.id).catch((error) => {
        logger.warn("Failed to stop external media playback after audio finished", {
          playbackId: playback.id,
          error: error instanceof Error ? error.message : String(error)
        })
      })
      return
    }

    const payload = playback.audioFrames[playback.frameIndex]
    playback.frameIndex += 1
    const packet = buildRtpPacket(playback, payload)

    playback.socket.send(packet, playback.remote.port, playback.remote.address, (error) => {
      if (error) {
        logger.warn("Failed to send RTP packet for external media", {
          playbackId: playback.id,
          error: error.message
        })
      }
    })
  }, FRAME_INTERVAL_MS)
}

export function attachExternalMediaRemote(
  playbackId: string,
  remote: {
    address: string
    port: number
  }
) {
  const playback = playbacks.get(playbackId)
  if (!playback || playback.remote) return false

  playback.remote = remote
  logger.info("External media remote attached from ARI channel vars", {
    playbackId,
    remoteAddress: remote.address,
    remotePort: remote.port
  })
  startStreaming(playback)
  return true
}

export async function startExternalMediaPlayback(input: {
  audioFilePath: string
}) {
  const audioBuffer = await fs.readFile(input.audioFilePath)
  const audioFrames = splitAudioFrames(audioBuffer)
  const port = allocatePort()
  const socket = dgram.createSocket("udp4")
  const playbackId = randomUUID()

  const playback: ExternalMediaPlayback = {
    id: playbackId,
    port,
    format: "alaw",
    socket,
    audioFrames,
    streamTimer: null,
    sequence: Math.floor(Math.random() * 65535),
    timestamp: 0,
    ssrc: Math.floor(Math.random() * 0xffffffff),
    frameIndex: 0
  }

  playbacks.set(playbackId, playback)

  logger.info("Prepared external media playback", {
    playbackId,
    port,
    frameCount: audioFrames.length,
    audioFilePath: input.audioFilePath
  })

  socket.on("message", (_message, remote) => {
    if (!playback.remote) {
      playback.remote = {
        address: remote.address,
        port: remote.port
      }
      logger.info("External media remote discovered", {
        playbackId,
        remoteAddress: remote.address,
        remotePort: remote.port
      })
      startStreaming(playback)
    }
  })

  socket.on("error", (error) => {
    logger.warn("External media UDP socket error", {
      playbackId,
      error: error.message
    })
  })

  await new Promise<void>((resolve, reject) => {
    socket.once("listening", () => resolve())
    socket.once("error", reject)
    socket.bind(port, env.asterisk.externalMediaBindAddress)
  })

  return {
    playbackId,
    port,
    format: playback.format
  }
}

export async function stopExternalMediaPlayback(playbackId: string) {
  const playback = playbacks.get(playbackId)
  if (!playback) return

  playbacks.delete(playbackId)

  if (playback.streamTimer) {
    clearInterval(playback.streamTimer)
  }

  logger.info("Stopping external media playback", {
    playbackId,
    framesSent: playback.frameIndex
  })

  await new Promise<void>((resolve) => {
    playback.socket.close(() => resolve())
  })
}
