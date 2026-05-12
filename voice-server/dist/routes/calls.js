import { Router } from "express";
import { getCallById, listActiveCalls, listCallHistory, listCalls } from "../services/callService.js";
import { answerCall, assignAgentToCall, hangupCall, transferCall } from "../asterisk/callController.js";
export const callsRouter = Router();
callsRouter.get("/", async (_req, res, next) => {
    try {
        res.json(await listCalls());
    }
    catch (error) {
        next(error);
    }
});
callsRouter.get("/active", async (_req, res, next) => {
    try {
        res.json(await listActiveCalls());
    }
    catch (error) {
        next(error);
    }
});
callsRouter.get("/history", async (_req, res, next) => {
    try {
        res.json(await listCallHistory());
    }
    catch (error) {
        next(error);
    }
});
callsRouter.get("/:id", async (req, res, next) => {
    try {
        res.json(await getCallById(req.params.id));
    }
    catch (error) {
        next(error);
    }
});
callsRouter.post("/:id/answer", async (req, res, next) => {
    try {
        res.json(await answerCall(req.params.id));
    }
    catch (error) {
        next(error);
    }
});
callsRouter.post("/:id/hangup", async (req, res, next) => {
    try {
        res.json(await hangupCall(req.params.id));
    }
    catch (error) {
        next(error);
    }
});
callsRouter.post("/:id/transfer", async (req, res, next) => {
    try {
        const endpoint = String(req.body?.endpoint || req.body?.extension || "");
        if (!endpoint) {
            return res.status(400).json({ error: "endpoint is required" });
        }
        res.json(await transferCall(req.params.id, endpoint));
    }
    catch (error) {
        next(error);
    }
});
callsRouter.post("/:id/assign-agent", async (req, res, next) => {
    try {
        const agentId = String(req.body?.agentId || "");
        if (!agentId) {
            return res.status(400).json({ error: "agentId is required" });
        }
        res.json(await assignAgentToCall(req.params.id, agentId));
    }
    catch (error) {
        next(error);
    }
});
