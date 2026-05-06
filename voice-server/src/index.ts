import cors from "cors"
import express from "express"
import path from "node:path"
import { env } from "./env.js"
import { logger } from "./utils/logger.js"
import { callsRouter } from "./routes/calls.js"
import { queuesRouter } from "./routes/queues.js"
import { agentsRouter } from "./routes/agents.js"
import { webhooksRouter } from "./routes/webhooks.js"
import { ariClient } from "./asterisk/ariClient.js"
import { amiClient } from "./asterisk/amiClient.js"
import { handleQueueAmiEvent } from "./asterisk/queueController.js"

const app = express()

app.set("trust proxy", true)
app.use(cors())
app.use(express.json({ limit: "2mb" }))
app.use(express.urlencoded({ extended: true }))

// No MVP a gravação pode ser servida localmente do diretório do MixMonitor.
app.use("/recordings", express.static(path.resolve(env.recordingsDir)))

app.get("/health", async (_req, res) => {
  const ariHealthy = await ariClient.healthcheck()

  res.json({
    ok: true,
    service: "axion-voice-server",
    time: new Date().toISOString(),
    integrations: {
      ari: ariHealthy,
      ami: amiClient.isConnected()
    }
  })
})

app.use("/calls", callsRouter)
app.use("/queues", queuesRouter)
app.use("/agents", agentsRouter)
app.use("/webhooks", webhooksRouter)

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message =
    error instanceof Error ? error.message : "Unexpected server error"

  logger.error("Request failed", { message })
  res.status(500).json({ error: message })
})

amiClient.on("event", async (event) => {
  try {
    if (!event.Event) return

    if (event.Event.startsWith("Queue") || event.Event === "AgentConnect") {
      await handleQueueAmiEvent(event)
    }
  } catch (error) {
    logger.error("Failed to process AMI event", {
      error: error instanceof Error ? error.message : String(error),
      event
    })
  }
})

app.listen(env.port, async () => {
  logger.info("Axion Voice server running", {
    port: env.port,
    publicBaseUrl: env.publicBaseUrl
  })

  await ariClient.healthcheck()
  amiClient.start()
})
