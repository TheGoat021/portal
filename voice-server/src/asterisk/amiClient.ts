import net from "node:net"
import EventEmitter from "node:events"
import { env } from "../env.js"
import { logger } from "../utils/logger.js"

type AmiEvent = Record<string, string>

function encodeAction(fields: Record<string, string | number>) {
  const chunks = Object.entries(fields).map(([key, value]) => `${key}: ${value}`)
  return `${chunks.join("\r\n")}\r\n\r\n`
}

function parseAmiMessage(raw: string): AmiEvent {
  const result: AmiEvent = {}

  for (const line of raw.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":")
    if (separatorIndex <= 0) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    result[key] = value
  }

  return result
}

export class AmiClient extends EventEmitter {
  private socket: net.Socket | null = null
  private buffer = ""
  private connected = false
  private loginRequested = false
  private reconnectTimer: NodeJS.Timeout | null = null

  start() {
    this.connect()
  }

  isConnected() {
    return this.connected
  }

  private connect() {
    this.loginRequested = false
    this.socket = net.createConnection({
      host: env.asterisk.amiHost,
      port: env.asterisk.amiPort
    })

    this.socket.setEncoding("utf8")

    this.socket.on("connect", () => {
      logger.info("Connected to AMI")
    })

    this.socket.on("data", (chunk) => {
      this.buffer += chunk

      if (!this.loginRequested && this.buffer.startsWith("Asterisk Call Manager/")) {
        const bannerEndIndex = this.buffer.search(/\r?\n/)

        if (bannerEndIndex >= 0) {
          this.buffer = this.buffer.slice(bannerEndIndex).replace(/^\r?\n/, "")
          this.login()
        }
      }

      this.flushBuffer()
    })

    this.socket.on("error", (error) => {
      logger.error("AMI socket error", { error: error.message })
    })

    this.socket.on("close", () => {
      this.connected = false
      this.loginRequested = false
      logger.warn("AMI socket closed, scheduling reconnect")
      this.scheduleReconnect()
    })
  }

  private flushBuffer() {
    const messages = this.buffer.split("\r\n\r\n")
    this.buffer = messages.pop() ?? ""

    for (const rawMessage of messages) {
      const normalizedMessage = rawMessage.trim()

      // The AMI greeting arrives as a plain banner instead of `key: value` pairs.
      // We use it as the signal to send the login action right away.
      if (normalizedMessage.startsWith("Asterisk Call Manager/")) {
        this.login()
        continue
      }

      const parsed = parseAmiMessage(rawMessage)

      if (
        parsed.Response === "Success" &&
        parsed.Message?.includes("Authentication accepted")
      ) {
        this.connected = true
        logger.info("AMI authenticated")
        continue
      }

      if (parsed.Response === "Error") {
        logger.error("AMI authentication failed", {
          message: parsed.Message ?? "unknown error"
        })
        continue
      }

      if (parsed.AsteriskCallManager) {
        this.login()
        continue
      }

      if (parsed.Event) {
        this.emit("event", parsed)
      }
    }
  }

  private login() {
    if (!this.socket || this.loginRequested) return

    this.loginRequested = true

    this.socket.write(
      encodeAction({
        Action: "Login",
        Username: env.asterisk.amiUser,
        Secret: env.asterisk.amiPassword,
        Events: "on"
      })
    )
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 5000)
  }
}

export const amiClient = new AmiClient()
