import { ariClient } from "./ariClient.js";
import { assignAgent, createCallEvent, createInboundCall, createOutboundCall, finalizeCall, findCallByExternalId, findCallByUniqueId, getCallById, setCallAnswered, setCallQueued } from "../services/callService.js";
import { updateAgentStatus } from "../services/agentService.js";
import { handleRecordingFinished } from "./recordingController.js";
import { logger } from "../utils/logger.js";
function firstString(...values) {
    for (const value of values) {
        if (value === null || value === undefined)
            continue;
        const normalized = String(value).trim();
        if (normalized)
            return normalized;
    }
    return "";
}
async function resolveCallByEvent(payload) {
    const byUniqueId = await findCallByUniqueId(String(payload.uniqueId ?? payload.unique_id ?? payload.Uniqueid ?? ""));
    if (byUniqueId)
        return byUniqueId;
    return findCallByExternalId(String(payload.channelId ?? payload.channel_id ?? payload.Channel ?? ""));
}
async function resolveExistingCall(payload) {
    const uniqueId = firstString(payload.uniqueId, payload.unique_id, payload.Uniqueid);
    if (uniqueId) {
        const byUniqueId = await findCallByUniqueId(uniqueId);
        if (byUniqueId)
            return byUniqueId;
    }
    const externalCallId = firstString(payload.channelId, payload.channel_id, payload.Channel);
    if (externalCallId) {
        return findCallByExternalId(externalCallId);
    }
    return null;
}
export async function handleAsteriskEvent(eventType, payload) {
    const caller = payload.caller;
    switch (eventType) {
        case "StasisStart":
        case "call.inbound":
            return createInboundCall({
                externalCallId: firstString(payload.channelId, payload.channel_id, payload.Channel),
                uniqueId: firstString(payload.uniqueId, payload.unique_id, payload.Uniqueid),
                linkedId: firstString(payload.linkedId, payload.linked_id, payload.Linkedid),
                phone: firstString(payload.callerNumber, payload.caller_number, payload.CallerIDNum, caller?.number),
                calledNumber: firstString(payload.calledNumber, payload.called_number, payload.didNumber, payload.did_number, payload.Exten),
                didNumber: firstString(payload.didNumber, payload.did_number, payload.CallerIDDNID, payload.DNID),
                dialedExtension: firstString(payload.dialedExtension, payload.dialed_extension, payload.Exten),
                queueId: payload.queueId ? String(payload.queueId) : null,
                startedAt: payload.startedAt ? String(payload.startedAt) : null
            });
        case "call.outbound": {
            const existing = await resolveExistingCall(payload);
            if (existing?.id)
                return existing;
            return createOutboundCall({
                externalCallId: firstString(payload.channelId, payload.channel_id, payload.Channel),
                uniqueId: firstString(payload.uniqueId, payload.unique_id, payload.Uniqueid),
                linkedId: firstString(payload.linkedId, payload.linked_id, payload.Linkedid),
                phone: firstString(payload.phone, payload.targetNumber, payload.target_number, payload.calledNumber, payload.called_number, payload.Exten),
                dialedExtension: firstString(payload.dialedExtension, payload.dialed_extension, payload.callerExtension, payload.caller_extension, payload.CallerIDNum),
                agentId: payload.agentId ? String(payload.agentId) : null,
                startedAt: payload.startedAt ? String(payload.startedAt) : null
            });
        }
        case "QueueCallerJoin":
        case "call.queued": {
            const call = await resolveCallByEvent(payload);
            if (!call?.id)
                return null;
            return setCallQueued(String(call.id), payload.queueId ? String(payload.queueId) : null);
        }
        case "AgentConnect":
        case "call.answered": {
            const call = await resolveCallByEvent(payload);
            if (!call?.id)
                return null;
            const agentId = payload.agentId ? String(payload.agentId) : null;
            const updated = await setCallAnswered(String(call.id), agentId, payload.answeredAt ? String(payload.answeredAt) : null);
            if (agentId) {
                await updateAgentStatus(agentId, "in_call", String(call.id));
            }
            return updated;
        }
        case "Hangup":
        case "StasisEnd":
        case "call.ended": {
            const call = await resolveCallByEvent(payload);
            if (!call?.id)
                return null;
            const status = payload.finalStatus ?? "ended";
            const updated = await finalizeCall(String(call.id), status, payload.endedAt ? String(payload.endedAt) : null);
            if (updated.agent_id) {
                await updateAgentStatus(String(updated.agent_id), "available", null);
            }
            return updated;
        }
        case "recording.completed": {
            const call = await resolveCallByEvent(payload);
            if (!call?.id || !payload.filePath)
                return null;
            return handleRecordingFinished({
                callId: String(call.id),
                filePath: String(payload.filePath),
                durationSeconds: payload.durationSeconds
                    ? Number(payload.durationSeconds)
                    : null,
                publicUrl: payload.publicUrl ? String(payload.publicUrl) : null
            });
        }
        default: {
            const call = await resolveCallByEvent(payload);
            if (call?.id) {
                await createCallEvent(String(call.id), eventType, payload);
            }
            logger.info("Unhandled asterisk event received", { eventType, payload });
            return null;
        }
    }
}
export async function answerCall(callId) {
    const call = await getCallById(callId);
    if (!call.external_call_id) {
        throw new Error("Call does not have an external channel id yet");
    }
    await ariClient.answerChannel(String(call.external_call_id));
    await createCallEvent(callId, "call.answer_requested", {
        externalCallId: call.external_call_id
    });
    return { success: true };
}
export async function hangupCall(callId) {
    const call = await getCallById(callId);
    if (!call.external_call_id) {
        throw new Error("Call does not have an external channel id yet");
    }
    await ariClient.hangupChannel(String(call.external_call_id));
    await createCallEvent(callId, "call.hangup_requested", {
        externalCallId: call.external_call_id
    });
    return { success: true };
}
export async function transferCall(callId, endpoint) {
    const call = await getCallById(callId);
    if (!call.external_call_id) {
        throw new Error("Call does not have an external channel id yet");
    }
    await ariClient.transferChannel(String(call.external_call_id), endpoint);
    await createCallEvent(callId, "call.transfer_requested", { endpoint });
    return { success: true };
}
export async function assignAgentToCall(callId, agentId) {
    const updated = await assignAgent(callId, agentId);
    await updateAgentStatus(agentId, "ringing", callId);
    return updated;
}
