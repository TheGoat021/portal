import { Router } from "express"
import { handleAsteriskEvent } from "../asterisk/callController.js"

export const webhooksRouter = Router()

webhooksRouter.post("/asterisk/event", async (req, res, next) => {
  try {
    const eventType = String(req.body?.eventType || req.body?.type || "")
    const payload =
      typeof req.body?.payload === "object" && req.body.payload
        ? req.body.payload
        : req.body

    if (!eventType) {
      return res.status(400).json({ error: "eventType is required" })
    }

    const result = await handleAsteriskEvent(eventType, payload)

    res.json({
      ok: true,
      eventType,
      result
    })
  } catch (error) {
    next(error)
  }
})
