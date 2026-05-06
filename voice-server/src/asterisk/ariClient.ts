import { env } from "../env.js"
import { logger } from "../utils/logger.js"

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
  params?: Record<string, string | number>
) {
  const response = await fetch(buildUrl(pathname, params), {
    method,
    headers: {
      Authorization: authHeader()
    }
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`ARI request failed (${response.status}): ${body}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export class AriClient {
  private healthy = false

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
}

export const ariClient = new AriClient()
