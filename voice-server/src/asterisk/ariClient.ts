import { env } from "../env.js"
import { logger } from "../utils/logger.js"
import EventEmitter from "node:events"
import WebSocket from "ws"

function authHeader() {
  return `Basic ${Buffer.from(
    `${env.asterisk.ariUser}:${env.asterisk.ariPassword}`
  ).toString("base64")}`
}

function buildUrl(pathname: string, params?: Record<string, string | number>) {
  const base = new URL(env.asterisk.ariUrl)
  base.pathname = `${base.pathname.replace(/\/$/, "")}${pathname}`

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      base.searchParams.set(key, String(value))
    }
  }

  return base.toString()
}

async function request(
  method: string,
  pathname: string,
  params?: Record<string, string | number>,
  body?: Record<string, unknown>
) {
  const response = await fetch(buildUrl(pathname, params), {
    method,
    headers: {
      Authorization: authHeader(),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`ARI request failed (${response.status}): ${body}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function buildWebSocketUrl(pathname: string, params?: Record<string, string | number>) {
  const base = new URL(env.asterisk.ariUrl)
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:"
  base.pathname = `${base.pathname.replace(/\/$/, "")}${pathname}`

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      base.searchParams.set(key, String(value))
    }
  }

  return base.toString()
}

type AriEvent = Record<string, unknown>

export class AriClient extends EventEmitter {
  private healthy = false
  private eventSocket: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null

  async healthcheck() {
    try {
      await request("GET", "/ari/asterisk/info")
      this.healthy = true
      return true
    } catch (error) {
      this.healthy = false
      logger.warn("ARI healthcheck failed", {
        error: error instanceof Error ? error.message : String(error)
      })
      return false
    }
  }

  isHealthy() {
    return this.healthy
  }

  async answerChannel(channelId: string) {
    return request("POST", `/ari/channels/${encodeURIComponent(channelId)}/answer`)
  }

  async hangupChannel(channelId: string) {
    return request("DELETE", `/ari/channels/${encodeURIComponent(channelId)}`)
  }

  async transferChannel(channelId: string, endpoint: string) {
    return request(
      "POST",
      `/ari/channels/${encodeURIComponent(channelId)}/redirect`,
      { endpoint }
    )
  }

  async originateChannel(params: {
    endpoint: string
    appArgs?: string[]
    callerId?: string
    timeoutSeconds?: number
  }) {
    return request("POST", "/ari/channels", {
      endpoint: params.endpoint,
      app: env.asterisk.ariApp,
      ...(params.appArgs && params.appArgs.length > 0
        ? { appArgs: params.appArgs.join(",") }
        : {}),
      ...(params.callerId ? { callerId: params.callerId } : {}),
      ...(params.timeoutSeconds ? { timeout: params.timeoutSeconds } : {})
    })
  }

  async createBridge(type = "mixing") {
    return request("POST", "/ari/bridges", { type })
  }

  async addChannelToBridge(bridgeId: string, channelId: string) {
    return request("POST", `/ari/bridges/${encodeURIComponent(bridgeId)}/addChannel`, {
      channel: channelId
    })
  }

  async destroyBridge(bridgeId: string) {
    return request("DELETE", `/ari/bridges/${encodeURIComponent(bridgeId)}`)
  }

  async playOnChannel(channelId: string, media: string) {
    return request("POST", `/ari/channels/${encodeURIComponent(channelId)}/play`, {
      media
    })
  }

  startEventStream() {
    if (this.eventSocket) return

    const wsUrl = buildWebSocketUrl("/ari/events", {
      app: env.asterisk.ariApp,
      subscribeAll: "true",
      api_key: `${env.asterisk.ariUser}:${env.asterisk.ariPassword}`
    })

    const socket = new WebSocket(wsUrl)
    this.eventSocket = socket

    socket.on("open", () => {
      logger.info("Connected to ARI event stream", { app: env.asterisk.ariApp })
    })

    socket.on("message", (data: any) => {
      try {
        const parsed = JSON.parse(String(data)) as AriEvent
        this.emit("event", parsed)
      } catch (error) {
        logger.error("Failed to parse ARI event", {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    })

    socket.on("close", () => {
      this.eventSocket = null
      logger.warn("ARI event stream closed, scheduling reconnect")
      this.scheduleReconnect()
    })

    socket.on("error", (error: Error) => {
      logger.error("ARI event stream error", { error: error.message })
    })
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.startEventStream()
    }, 5000)
  }
}

export const ariClient = new AriClient()
