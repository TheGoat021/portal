import { supabaseAdmin } from "../supabase.js";
async function getAgentDirectoryRowByUserId(userId) {
    const { data, error } = await supabaseAdmin
        .from("voice_agent_directory_view")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) {
        throw new Error(`Failed to load agent directory row: ${error.message}`);
    }
    return data;
}
export async function listAgents() {
    const { data, error } = await supabaseAdmin
        .from("voice_agent_directory_view")
        .select("*")
        .order("name");
    if (error) {
        throw new Error(`Failed to list agents: ${error.message}`);
    }
    return data ?? [];
}
export async function createAgent(payload) {
    if (!payload.user_id) {
        throw new Error("user_id is required. Voice agents must be existing system users.");
    }
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("portal_users")
        .select("id, email")
        .eq("id", payload.user_id)
        .maybeSingle();
    if (profileError) {
        throw new Error(`Failed to load portal user: ${profileError.message}`);
    }
    if (!profile?.id) {
        throw new Error("System user not found for voice agent creation.");
    }
    const { data, error } = await supabaseAdmin
        .from("voice_agents")
        .upsert({
        user_id: payload.user_id ?? null,
        name: payload.name?.trim() || profile.email || "Usuario sem nome",
        extension: payload.extension,
        status: payload.status ?? "offline"
    }, {
        onConflict: "user_id"
    })
        .select("*")
        .single();
    if (error) {
        throw new Error(`Failed to create agent: ${error.message}`);
    }
    return (await getAgentDirectoryRowByUserId(profile.id)) ?? data;
}
export async function updateAgentStatus(agentId, status, currentCallId) {
    const { data, error } = await supabaseAdmin
        .from("voice_agents")
        .update({
        status,
        current_call_id: currentCallId ?? null,
        updated_at: new Date().toISOString()
    })
        .eq("id", agentId)
        .select("*")
        .single();
    if (error) {
        throw new Error(`Failed to update agent status: ${error.message}`);
    }
    return data;
}
export async function listAvailableAgents() {
    const { data, error } = await supabaseAdmin
        .from("voice_agent_directory_view")
        .select("*")
        .eq("status", "available")
        .order("name");
    if (error) {
        throw new Error(`Failed to list available agents: ${error.message}`);
    }
    return data ?? [];
}
