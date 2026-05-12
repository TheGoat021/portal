import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type ProvisionPayload = {
  user_id?: string
  extension?: string
  status?: "offline" | "available" | "ringing" | "in_call" | "paused"
}

export async function GET() {
  try {
    const { data: users, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .order("email", { ascending: true })

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("voice_agents")
      .select("id, user_id, name, extension, status, current_call_id, created_at, updated_at")
      .order("name", { ascending: true })

    if (agentsError) {
      const looksLikeMissingVoiceSchema =
        agentsError.code === "42P01" ||
        /voice_agents/i.test(agentsError.message)

      if (looksLikeMissingVoiceSchema) {
        return NextResponse.json({
          agents: [],
          unassignedUsers: users ?? [],
          warning:
            "As tabelas do Axion Voice ainda nao estao disponiveis neste ambiente. Aplique as migrations do modulo de voz no Supabase para habilitar o provisionamento."
        })
      }

      return NextResponse.json({ error: agentsError.message }, { status: 500 })
    }

    const userMap = new Map(
      (users ?? []).map((user) => [user.id, user])
    )

    const enrichedAgents = (agents ?? []).map((agent) => {
      const user = agent.user_id ? userMap.get(agent.user_id) : null
      return {
        ...agent,
        email: user?.email ?? null,
        role: user?.role ?? null
      }
    })

    const assignedUserIds = new Set(
      enrichedAgents
        .map((agent) => agent.user_id)
        .filter((value): value is string => Boolean(value))
    )

    const unassignedUsers = (users ?? []).filter((user) => !assignedUserIds.has(user.id))

    return NextResponse.json({
      agents: enrichedAgents,
      unassignedUsers
    })
  } catch (error) {
    console.error("Erro ao listar diretorio de voz:", error)
    return NextResponse.json(
      { error: "Erro interno ao listar usuarios do Axion Voice." },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProvisionPayload
    const userId = String(body.user_id || "").trim()
    const extension = String(body.extension || "").trim().replace(/\D/g, "")

    if (!userId || !extension) {
      return NextResponse.json(
        { error: "user_id e extension sao obrigatorios." },
        { status: 400 }
      )
    }

    if (extension.length < 3 || extension.length > 6) {
      return NextResponse.json(
        { error: "O ramal deve conter entre 3 e 6 digitos numericos." },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile?.id) {
      return NextResponse.json(
        { error: "Usuario do sistema nao encontrado para este ramal." },
        { status: 404 }
      )
    }

    const { data: existingAgent, error: existingAgentError } = await supabaseAdmin
      .from("voice_agents")
      .select("id, user_id, extension, name")
      .eq("extension", extension)
      .maybeSingle()

    if (existingAgentError) {
      return NextResponse.json({ error: existingAgentError.message }, { status: 500 })
    }

    if (existingAgent && existingAgent.user_id !== userId) {
      return NextResponse.json(
        {
          error: `O ramal ${extension} ja esta vinculado a outro usuario do Axion Voice.`
        },
        { status: 409 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("voice_agents")
      .upsert(
        {
          user_id: userId,
          name: profile.email || "Usuario sem nome",
          extension,
          status: body.status ?? "offline"
        },
        {
          onConflict: "user_id"
        }
      )
      .select("id, user_id, name, extension, status, current_call_id, created_at, updated_at")
      .single()

    if (error) {
      const looksLikeMissingVoiceSchema =
        error.code === "42P01" ||
        /voice_agents/i.test(error.message)

      if (looksLikeMissingVoiceSchema) {
        return NextResponse.json(
          {
            error:
              "As tabelas do Axion Voice ainda nao estao disponiveis neste ambiente. Aplique as migrations do modulo de voz no Supabase antes de criar ramais."
          },
          { status: 400 }
        )
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro ao provisionar agente de voz:", error)
    return NextResponse.json(
      { error: "Erro interno ao provisionar ramal de voz." },
      { status: 500 }
    )
  }
}
