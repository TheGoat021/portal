import { Router } from "express";
import { addAgentToQueue, createQueue, listQueueCalls, listQueues, removeAgentFromQueue, updateQueue } from "../services/queueService.js";
export const queuesRouter = Router();
queuesRouter.get("/", async (_req, res, next) => {
    try {
        res.json(await listQueues());
    }
    catch (error) {
        next(error);
    }
});
queuesRouter.post("/", async (req, res, next) => {
    try {
        res.json(await createQueue(req.body));
    }
    catch (error) {
        next(error);
    }
});
queuesRouter.put("/:id", async (req, res, next) => {
    try {
        res.json(await updateQueue(req.params.id, req.body));
    }
    catch (error) {
        next(error);
    }
});
queuesRouter.get("/:id/calls", async (req, res, next) => {
    try {
        res.json(await listQueueCalls(req.params.id));
    }
    catch (error) {
        next(error);
    }
});
queuesRouter.post("/:id/agents", async (req, res, next) => {
    try {
        const agentId = String(req.body?.agentId || "");
        if (!agentId) {
            return res.status(400).json({ error: "agentId is required" });
        }
        res.json(await addAgentToQueue({
            queueId: req.params.id,
            agentId,
            priority: req.body?.priority,
            active: req.body?.active
        }));
    }
    catch (error) {
        next(error);
    }
});
queuesRouter.delete("/:id/agents/:agentId", async (req, res, next) => {
    try {
        res.json(await removeAgentFromQueue(req.params.id, req.params.agentId));
    }
    catch (error) {
        next(error);
    }
});
