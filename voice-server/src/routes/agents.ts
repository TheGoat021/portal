import { Router } from "express"
import {
  createAgent,
  listAgents,
  listAvailableAgents,
  updateAgentStatus
} from "../services/agentService.js"

export const agentsRouter = Router()

agentsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listAgents())
  } catch (error) {
    next(error)
  }
})

agentsRouter.post("/", async (req, res, next) => {
  try {
    const userId = String(req.body?.user_id || req.body?.userId || "")
    const extension = String(req.body?.extension || "")

    if (!userId || !extension) {
      return res.status(400).json({
        error: "user_id and extension are required. Agents must be existing system users."
      })
    }

    res.json(await createAgent(req.body))
  } catch (error) {
    next(error)
  }
})

agentsRouter.put("/:id/status", async (req, res, next) => {
  try {
    const status = String(req.body?.status || "")
    if (!status) {
      return res.status(400).json({ error: "status is required" })
    }

    res.json(
      await updateAgentStatus(
        req.params.id,
        status as
          | "offline"
          | "available"
          | "ringing"
          | "in_call"
          | "paused",
        req.body?.currentCallId ?? null
      )
    )
  } catch (error) {
    next(error)
  }
})

agentsRouter.get("/available", async (_req, res, next) => {
  try {
    res.json(await listAvailableAgents())
  } catch (error) {
    next(error)
  }
})
