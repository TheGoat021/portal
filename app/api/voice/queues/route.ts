import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type QueuePayload = {
  name?: string
  slug?: string
  description?: string | null
  inbound_number?: string | null
  greeting_audio_url?: string | null
  greeting_audio_name?: string | null
  strategy?: string
  max_wait_seconds?: number
  active?: boolean
  members?: Array<{
    agent_id?: string
    priority?: number
    active?: boolean
  }>
}

function sanitizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeQueuePayload(body: QueuePayload) {
  const name = String(body.name || "").trim()
  const slug = sanitizeSlug(String(body.slug || name))
  const strategy = String(body.strategy || "ringall").trim().toLowerCase()
  const maxWaitSeconds = Number(body.max_wait_seconds ?? 300)
  const description = body.description ? String(body.description).trim() : null
  const inboundNumber = body.inbound_number
    ? String(body.inbound_number).replace(/\D/g, "").trim()
    : null
  const greetingAudioUrl = body.greeting_audio_url
    ? String(body.greeting_audio_url).trim()
    : null
  const greetingAudioName = body.greeting_audio_name
    ? String(body.greeting_audio_name).trim()
    : null
  const active = body.active ?? true
  const members = (body.members ?? [])
    .map((member) => ({
      agent_id: String(member.agent_id || "").trim(),
      priority: Number(member.priority ?? 1),
      active: member.active ?? true
    }))
    .filter((member) => member.agent_id)

  return {
    name,
    slug,
    strategy,
    max_wait_seconds: Number.isFinite(maxWaitSeconds) ? maxWaitSeconds : NaN,
    description,
    inbound_number: inboundNumber || null,
    greeting_audio_url: greetingAudioUrl || null,
    greeting_audio_name: greetingAudioName || null,
    active,
    members
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("voice_queues")
      .select(`
        id,
        name,
        slug,
        description,
        inbound_number,
        greeting_audio_url,
        greeting_audio_name,
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
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      queues: data ?? []
    })
  } catch (error) {
    console.error("Erro ao listar filas de voz:", error)
    return NextResponse.json(
      { error: "Erro interno ao listar filas do Axion Voice." },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QueuePayload
    const payload = normalizeQueuePayload(body)

    if (!payload.name || !payload.slug) {
      return NextResponse.json(
        { error: "Nome e slug da fila sao obrigatorios." },
        { status: 400 }
      )
    }

    if (!payload.strategy) {
      return NextResponse.json(
        { error: "A estrategia da fila e obrigatoria." },
        { status: 400 }
      )
    }

    if (!Number.isInteger(payload.max_wait_seconds) || payload.max_wait_seconds <= 0) {
      return NextResponse.json(
        { error: "O timeout maximo deve ser um numero inteiro positivo." },
        { status: 400 }
      )
    }

    if (payload.inbound_number && payload.inbound_number.length < 8) {
      return NextResponse.json(
        { error: "O numero de entrada da fila parece invalido." },
        { status: 400 }
      )
    }

    const { data: existingQueue, error: existingQueueError } = await supabaseAdmin
      .from("voice_queues")
      .select("id")
      .eq("slug", payload.slug)
      .maybeSingle()

    if (existingQueueError) {
      return NextResponse.json({ error: existingQueueError.message }, { status: 500 })
    }

    if (existingQueue?.id) {
      return NextResponse.json(
        { error: `Ja existe uma fila com o slug ${payload.slug}.` },
        { status: 409 }
      )
    }

    if (payload.inbound_number) {
      const { data: existingInbound, error: existingInboundError } = await supabaseAdmin
        .from("voice_queues")
        .select("id")
        .eq("inbound_number", payload.inbound_number)
        .maybeSingle()

      if (existingInboundError) {
        return NextResponse.json({ error: existingInboundError.message }, { status: 500 })
      }

      if (existingInbound?.id) {
        return NextResponse.json(
          { error: `Ja existe uma fila vinculada ao numero ${payload.inbound_number}.` },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from("voice_queues")
      .insert({
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        inbound_number: payload.inbound_number,
        greeting_audio_url: payload.greeting_audio_url,
        greeting_audio_name: payload.greeting_audio_name,
        strategy: payload.strategy,
        max_wait_seconds: payload.max_wait_seconds,
        active: payload.active
      })
      .select("id, name, slug, description, inbound_number, greeting_audio_url, greeting_audio_name, strategy, max_wait_seconds, active, created_at, updated_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (payload.members.length > 0) {
      const memberRows = payload.members.map((member) => ({
        queue_id: data.id,
        agent_id: member.agent_id,
        priority: Number.isInteger(member.priority) && member.priority > 0 ? member.priority : 1,
        active: member.active
      }))

      const { error: memberInsertError } = await supabaseAdmin
        .from("voice_queue_agents")
        .upsert(memberRows, {
          onConflict: "queue_id,agent_id"
        })

      if (memberInsertError) {
        return NextResponse.json({ error: memberInsertError.message }, { status: 500 })
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar fila de voz:", error)
    return NextResponse.json(
      { error: "Erro interno ao criar fila do Axion Voice." },
      { status: 500 }
    )
  }
}
