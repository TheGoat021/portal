import { env } from "../env.js";
import { logger } from "../utils/logger.js";
function authHeader() {
    return `Basic ${Buffer.from(`${env.asterisk.ariUser}:${env.asterisk.ariPassword}`).toString("base64")}`;
}
function buildUrl(pathname, params) {
    const base = new URL(env.asterisk.ariUrl);
    base.pathname = `${base.pathname.replace(/\/$/, "")}${pathname}`;
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            base.searchParams.set(key, String(value));
        }
    }
    return base.toString();
}
async function request(method, pathname, params) {
    const response = await fetch(buildUrl(pathname, params), {
        method,
        headers: {
            Authorization: authHeader()
        }
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`ARI request failed (${response.status}): ${body}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}
export class AriClient {
    healthy = false;
    async healthcheck() {
        try {
            await request("GET", "/ari/asterisk/info");
            this.healthy = true;
            return true;
        }
        catch (error) {
            this.healthy = false;
            logger.warn("ARI healthcheck failed", {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    isHealthy() {
        return this.healthy;
    }
    async answerChannel(channelId) {
        return request("POST", `/ari/channels/${encodeURIComponent(channelId)}/answer`);
    }
    async hangupChannel(channelId) {
        return request("DELETE", `/ari/channels/${encodeURIComponent(channelId)}`);
    }
    async transferChannel(channelId, endpoint) {
        return request("POST", `/ari/channels/${encodeURIComponent(channelId)}/redirect`, { endpoint });
    }
}
export const ariClient = new AriClient();
