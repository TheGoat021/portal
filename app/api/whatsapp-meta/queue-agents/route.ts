import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { setAgentAvailability } from "@/lib/metaQueueDistribution"

function normalizeRole(role: string) {
  return role.trim().toUpperCase()
}

function isManagerRole(role: string) {
  const normalized = normalizeRole(role)
  return (
    normalized === "DIRETORIA" ||
    normalized === "ADMIN" ||
    normalized === "ADMINISTRACAO" ||
    normalized === "ADMINISTRAÇÃO"
  )
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const connectionId = String(url.searchParams.get("connectionId") || "")
    const actorRole = String(url.searchParams.get("actorRole") || "")

    if (!connectionId) {
      return NextResponse.json({ ok: false, error: "connectionId e obrigatorio" }, { status: 400 })
    }

    if (!isManagerRole(actorRole)) {
      return NextResponse.json({ ok: false, error: "Sem permissao para visualizar operadores da fila" }, { status: 403 })
    }

    const [{ data: users, error: usersError }, { data: availabilityRows, error: availabilityError }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id, email, role").order("email", { ascending: true }),
        supabaseAdmin
          .from("meta_queue_agent_availability")
          .select("user_id, is_active, updated_at")
          .eq("connection_id", connectionId)
      ])

    if (usersError) {
      return NextResponse.json({ ok: false, error: usersError.message }, { status: 500 })
    }

    if (availabilityError) {
      return NextResponse.json({ ok: false, error: availabilityError.message }, { status: 500 })
    }

    const availabilityMap = new Map<
      string,
      {
        is_active: boolean
        updated_at: string | null
      }
    >()

    for (const row of availabilityRows ?? []) {
      availabilityMap.set(String(row.user_id), {
        is_active: Boolean(row.is_active),
        updated_at: row.updated_at ? String(row.updated_at) : null
      })
    }

    const data = (users ?? []).map((user) => {
      const availability = availabilityMap.get(String(user.id))
      return {
        id: String(user.id),
        email: user.email ? String(user.email) : "",
        role: user.role ? String(user.role) : "",
        isActiveInQueue: availability?.is_active ?? false,
        updatedAt: availability?.updated_at ?? null
      }
    })

    return NextResponse.json({ ok: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar operadores da fila"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const connectionId = String(body?.connectionId || "")
    const actorUserId = String(body?.actorUserId || "")
    const actorUserRole = String(body?.actorUserRole || "")
    const targetUserId = String(body?.targetUserId || "")
    const isActive = Boolean(body?.isActive)

    if (!connectionId || !actorUserId || !actorUserRole || !targetUserId) {
      return NextResponse.json(
        { ok: false, error: "connectionId, actorUserId, actorUserRole e targetUserId sao obrigatorios" },
        { status: 400 }
      )
    }

    if (!isManagerRole(actorUserRole)) {
      return NextResponse.json({ ok: false, error: "Sem permissao para atualizar operadores da fila" }, { status: 403 })
    }

    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .eq("id", targetUserId)
      .maybeSingle()

    if (targetProfileError) {
      return NextResponse.json({ ok: false, error: targetProfileError.message }, { status: 500 })
    }

    if (!targetProfile) {
      return NextResponse.json({ ok: false, error: "Usuario alvo nao encontrado" }, { status: 404 })
    }

    const saved = await setAgentAvailability({
      connectionId,
      userId: targetUserId,
      isActive,
      updatedByUserId: actorUserId
    })

    return NextResponse.json({
      ok: true,
      data: {
        ...saved,
        targetUserEmail: targetProfile.email ?? null,
        targetUserRole: targetProfile.role ?? null
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar operador da fila"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

