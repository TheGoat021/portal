import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

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

    if (!connectionId) {
      return NextResponse.json({ ok: false, error: "connectionId e obrigatorio" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("meta_queue_settings")
      .select("*")
      .eq("connection_id", connectionId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      data:
        data ?? {
          connection_id: connectionId,
          auto_distribution_enabled: false,
          max_simultaneous_enabled: false,
          max_simultaneous_per_agent: null,
          auto_close_inactive_enabled: false,
          inactive_close_minutes: null
        }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar configuracoes"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()

    const connectionId = String(body?.connectionId || "")
    const userId = String(body?.userId || "")
    const userRole = String(body?.userRole || "")

    if (!connectionId) {
      return NextResponse.json({ ok: false, error: "connectionId e obrigatorio" }, { status: 400 })
    }

    if (!userId || !userRole) {
      return NextResponse.json({ ok: false, error: "userId e userRole sao obrigatorios" }, { status: 400 })
    }

    if (!isManagerRole(userRole)) {
      return NextResponse.json({ ok: false, error: "Sem permissao para alterar configuracoes" }, { status: 403 })
    }

    const autoDistributionEnabled = Boolean(body?.autoDistributionEnabled)
    const maxSimultaneousEnabled = Boolean(body?.maxSimultaneousEnabled)
    const maxSimultaneousPerAgentRaw = body?.maxSimultaneousPerAgent
    const autoCloseInactiveEnabled = Boolean(body?.autoCloseInactiveEnabled)
    const inactiveCloseMinutesRaw = body?.inactiveCloseMinutes

    const maxSimultaneousPerAgent = maxSimultaneousEnabled
      ? Number(maxSimultaneousPerAgentRaw || 0)
      : null
    const inactiveCloseMinutes = autoCloseInactiveEnabled
      ? Number(inactiveCloseMinutesRaw || 0)
      : null

    const maxSimultaneousValue = maxSimultaneousPerAgent ?? 0
    const inactiveCloseValue = inactiveCloseMinutes ?? 0

    if (maxSimultaneousEnabled && (!Number.isInteger(maxSimultaneousValue) || maxSimultaneousValue < 1)) {
      return NextResponse.json(
        { ok: false, error: "Limite de atendimentos simultaneos deve ser um inteiro maior que zero" },
        { status: 400 }
      )
    }

    if (autoCloseInactiveEnabled && (!Number.isInteger(inactiveCloseValue) || inactiveCloseValue < 1)) {
      return NextResponse.json(
        { ok: false, error: "Minutos de inatividade deve ser um inteiro maior que zero" },
        { status: 400 }
      )
    }

    const payload = {
      connection_id: connectionId,
      auto_distribution_enabled: autoDistributionEnabled,
      max_simultaneous_enabled: maxSimultaneousEnabled,
      max_simultaneous_per_agent: maxSimultaneousPerAgent,
      auto_close_inactive_enabled: autoCloseInactiveEnabled,
      inactive_close_minutes: inactiveCloseMinutes,
      updated_by_user_id: userId,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from("meta_queue_settings")
      .upsert(payload, { onConflict: "connection_id" })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao salvar configuracoes"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
