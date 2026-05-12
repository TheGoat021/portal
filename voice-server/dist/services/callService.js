import { resolveCrmAssociationByPhone } from "./crmService.js";
import { supabaseAdmin } from "../supabase.js";
import { normalizePhone } from "../utils/phone.js";
function secondsBetween(start, end) {
    if (!start || !end)
        return null;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return null;
    }
    return Math.max(0, Math.round((endMs - startMs) / 1000));
}
export async function listCalls() {
    const { data, error } = await supabaseAdmin
        .from("voice_calls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
    if (error) {
        throw new Error(`Failed to list calls: ${error.message}`);
    }
    return data ?? [];
}
export async function getCallById(callId) {
    const { data, error } = await supabaseAdmin
        .from("voice_calls")
        .select("*")
        .eq("id", callId)
        .single();
    if (error) {
        throw new Error(`Failed to get call: ${error.message}`);
    }
    return data;
}
export async function listActiveCalls() {
    const { data, error } = await supabaseAdmin
        .from("voice_calls")
        .select("*")
        .in("status", ["ringing", "queued", "answered"])
        .order("started_at", { ascending: true });
    if (error) {
        throw new Error(`Failed to list active calls: ${error.message}`);
    }
    return data ?? [];
}
export async function listCallHistory() {
    const { data, error } = await supabaseAdmin
        .from("voice_calls")
        .select("*")
        .in("status", ["missed", "abandoned", "ended", "failed", "transferred"])
        .order("ended_at", { ascending: false })
        .limit(200);
    if (error) {
        throw new Error(`Failed to list call history: ${error.message}`);
    }
    return data ?? [];
}
export async function createCallEvent(callId, eventType, payload) {
    const { error } = await supabaseAdmin.from("voice_call_events").insert({
        call_id: callId,
        event_type: eventType,
        payload
    });
    if (error) {
        throw new Error(`Failed to create call event: ${error.message}`);
    }
}
export async function createInboundCall(input) {
    const normalizedPhone = normalizePhone(input.phone);
    const crm = await resolveCrmAssociationByPhone(normalizedPhone);
    const { data, error } = await supabaseAdmin
        .from("voice_calls")
        .insert({
        external_call_id: input.externalCallId ?? null,
        unique_id: input.uniqueId ?? null,
        linked_id: input.linkedId ?? null,
        direction: "inbound",
        phone: input.phone ?? "",
        normalized_phone: crm.normalizedPhone,
        status: "ringing",
        queue_id: input.queueId ?? null,
        cliente_id: crm.clienteId,
        lead_id: crm.leadId,
        started_at: input.startedAt ?? new Date().toISOString()
    })
        .select("*")
        .single();
    if (error) {
        throw new Error(`Failed to create inbound call: ${error.message}`);
    }
    await createCallEvent(String(data.id), "call.created", {
        source: "asterisk",
        crmMatchType: crm.matchType,
        externalCallId: input.externalCallId ?? null,
        uniqueId: input.uniqueId ?? null,
        linkedId: input.linkedId ?? null
    });
    return data;
}
export async function findCallByUniqueId(uniqueId) {
    if (!uniqueId)
        return null;
    const { data, error } = await supabaseAdmin
        .from("voice_calls")
        .select("*")
        .eq("unique_id", uniqueId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) {
        throw new Error(`Failed to query call by unique id: ${error.message}`);
    }
    return data;
}
export async function findCallByExternalId(externalCallId) {
    if (!externalCallId)
        return null;
    const { data, error } = await supabaseAdmin
        .from("voice_calls")
        .select("*")
        .eq("external_call_id", externalCallId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) {
        throw new Error(`Failed to query call by external id: ${error.message}`);
    }
    return data;
}
export async function updateCall(callId, payload) {
    const { data, error } = await supabaseAdmin
        .from("voice_calls")
        .update({
        ...payload,
        updated_at: new Date().toISOString()
    })
        .eq("id", callId)
        .select("*")
        .single();
    if (error) {
        throw new Error(`Failed to update call: ${error.message}`);
    }
    return data;
}
export async function setCallQueued(callId, queueId) {
    const call = await getCallById(callId);
    const updated = await updateCall(callId, {
        status: "queued",
        queue_id: queueId ?? call.queue_id
    });
    await createCallEvent(callId, "call.queued", {
        queueId: queueId ?? call.queue_id
    });
    return updated;
}
export async function setCallAnswered(callId, agentId, answeredAt) {
    const call = await getCallById(callId);
    const answered = answeredAt ?? new Date().toISOString();
    const updated = await updateCall(callId, {
        status: "answered",
        agent_id: agentId ?? call.agent_id,
        answered_at: answered,
        wait_seconds: secondsBetween(call.started_at, answered)
    });
    await createCallEvent(callId, "call.answered", {
        agentId: agentId ?? call.agent_id,
        answeredAt: answered
    });
    return updated;
}
export async function finalizeCall(callId, status, endedAt) {
    const call = await getCallById(callId);
    const finalEndedAt = endedAt ?? new Date().toISOString();
    const waitSeconds = call.answered_at
        ? secondsBetween(call.started_at, call.answered_at)
        : secondsBetween(call.started_at, finalEndedAt);
    const durationSeconds = call.answered_at
        ? secondsBetween(call.answered_at, finalEndedAt)
        : 0;
    const updated = await updateCall(callId, {
        status,
        ended_at: finalEndedAt,
        wait_seconds: waitSeconds,
        duration_seconds: durationSeconds
    });
    await createCallEvent(callId, `call.${status}`, {
        endedAt: finalEndedAt,
        durationSeconds,
        waitSeconds
    });
    return updated;
}
export async function assignAgent(callId, agentId) {
    const updated = await updateCall(callId, {
        agent_id: agentId
    });
    await createCallEvent(callId, "call.agent_assigned", { agentId });
    return updated;
}
