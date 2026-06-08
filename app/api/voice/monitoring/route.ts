import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { buildVoiceMonitoringSnapshot } from "@/lib/voice/monitoringShared"
import { VoiceAgent, VoiceCall, VoiceQueue } from "@/lib/voice/types"

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId")

    const [agentsResult, queuesResult, callsResult] = await Promise.all([
      supabaseAdmin
        .from("voice_agent_directory_view")
        .select("id, user_id, name, extension, status, current_call_id, updated_at")
        .order("name", { ascending: true }),
      supabaseAdmin
        .from("voice_queues")
        .select(`
          id,
          name,
          slug,
          description,
          inbound_number,
          strategy,
          max_wait_seconds,
          active,
          created_at,
          updated_at,
          members:voice_queue_agents(
            id,
            queue_id,
            agent_id,
            priority,
            active,
            agent:voice_agents(
              id,
              user_id,
              name,
              extension,
              status,
              current_call_id,
              updated_at
            )
          )
        `)
        .order("name", { ascending: true }),
      supabaseAdmin
        .from("voice_calls")
        .select(`
          id,
          phone,
          normalized_phone,
          called_number,
          did_number,
          dialed_extension,
          direction,
          status,
          started_at,
          answered_at,
          ended_at,
          wait_seconds,
          duration_seconds,
          queue_id,
          agent_id,
          recording_url,
          cliente_id,
          lead_id
        `)
        .order("started_at", { ascending: false })
        .limit(1000)
    ])

    if (agentsResult.error) {
      return NextResponse.json({ error: agentsResult.error.message }, { status: 500 })
    }

    if (queuesResult.error) {
      return NextResponse.json({ error: queuesResult.error.message }, { status: 500 })
    }

    if (callsResult.error) {
      return NextResponse.json({ error: callsResult.error.message }, { status: 500 })
    }

    const normalizedQueues = ((queuesResult.data ?? []) as Array<Record<string, unknown>>).map((queue) => ({
      ...queue,
      members: Array.isArray(queue.members)
        ? queue.members.map((member) => ({
            ...member,
            agent: Array.isArray(member.agent) ? member.agent[0] ?? null : member.agent ?? null
          }))
        : []
    }))

    const snapshot = buildVoiceMonitoringSnapshot(
      (callsResult.data ?? []) as VoiceCall[],
      (agentsResult.data ?? []) as VoiceAgent[],
      normalizedQueues as unknown as VoiceQueue[],
      userId
    )

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error("Erro ao montar snapshot de monitoramento de voz:", error)
    return NextResponse.json(
      { error: "Erro interno ao montar monitoramento do Axion Voice." },
      { status: 500 }
    )
  }
}
