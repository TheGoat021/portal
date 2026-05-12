import { supabaseAdmin } from "../supabase.js";
export async function listQueues() {
    const { data, error } = await supabaseAdmin
        .from("voice_queues")
        .select("*")
        .order("name");
    if (error) {
        throw new Error(`Failed to list queues: ${error.message}`);
    }
    return data ?? [];
}
export async function createQueue(payload) {
    const { data, error } = await supabaseAdmin
        .from("voice_queues")
        .insert({
        name: payload.name,
        slug: payload.slug,
        description: payload.description ?? null,
        strategy: payload.strategy ?? "ringall",
        max_wait_seconds: payload.max_wait_seconds ?? 300,
        active: payload.active ?? true
    })
        .select("*")
        .single();
    if (error) {
        throw new Error(`Failed to create queue: ${error.message}`);
    }
    return data;
}
export async function updateQueue(queueId, payload) {
    const { data, error } = await supabaseAdmin
        .from("voice_queues")
        .update({
        ...payload,
        updated_at: new Date().toISOString()
    })
        .eq("id", queueId)
        .select("*")
        .single();
    if (error) {
        throw new Error(`Failed to update queue: ${error.message}`);
    }
    return data;
}
export async function listQueueCalls(queueId) {
    const { data, error } = await supabaseAdmin
        .from("voice_calls")
        .select("*")
        .eq("queue_id", queueId)
        .in("status", ["ringing", "queued", "answered"])
        .order("started_at", { ascending: true });
    if (error) {
        throw new Error(`Failed to list queue calls: ${error.message}`);
    }
    return data ?? [];
}
export async function addAgentToQueue(payload) {
    const { data, error } = await supabaseAdmin
        .from("voice_queue_agents")
        .insert({
        queue_id: payload.queueId,
        agent_id: payload.agentId,
        priority: payload.priority ?? 1,
        active: payload.active ?? true
    })
        .select("*")
        .single();
    if (error) {
        throw new Error(`Failed to add agent to queue: ${error.message}`);
    }
    return data;
}
export async function removeAgentFromQueue(queueId, agentId) {
    const { error } = await supabaseAdmin
        .from("voice_queue_agents")
        .delete()
        .eq("queue_id", queueId)
        .eq("agent_id", agentId);
    if (error) {
        throw new Error(`Failed to remove agent from queue: ${error.message}`);
    }
    return { success: true };
}
