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

function normalizeSettingsRow(connectionId: string, row: Record<string, unknown> | null | undefined) {
  return {
    connection_id: connectionId,
    auto_distribution_enabled: Boolean(row?.auto_distribution_enabled ?? true),
    max_simultaneous_enabled: Boolean(row?.max_simultaneous_enabled ?? false),
    max_simultaneous_per_agent:
      row?.max_simultaneous_per_agent == null ? null : Number(row.max_simultaneous_per_agent),
    auto_close_inactive_enabled: Boolean(row?.auto_close_inactive_enabled ?? false),
    inactive_close_minutes: row?.inactive_close_minutes == null ? null : Number(row.inactive_close_minutes),
    response_alerts_enabled: Boolean(row?.response_alerts_enabled ?? false),
    response_alert_warning_minutes:
      row?.response_alert_warning_minutes == null ? 10 : Number(row.response_alert_warning_minutes),
    response_alert_danger_minutes:
      row?.response_alert_danger_minutes == null ? 30 : Number(row.response_alert_danger_minutes)
  }
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
      data: normalizeSettingsRow(connectionId, (data as Record<string, unknown>) ?? null)
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
    const responseAlertsEnabled = Boolean(body?.responseAlertsEnabled)
    const responseAlertWarningMinutesRaw = body?.responseAlertWarningMinutes
    const responseAlertDangerMinutesRaw = body?.responseAlertDangerMinutes

    const maxSimultaneousPerAgent = maxSimultaneousEnabled
      ? Number(maxSimultaneousPerAgentRaw || 0)
      : null
    const inactiveCloseMinutes = autoCloseInactiveEnabled
      ? Number(inactiveCloseMinutesRaw || 0)
      : null
    const responseAlertWarningMinutes = responseAlertsEnabled
      ? Number(responseAlertWarningMinutesRaw || 0)
      : null
    const responseAlertDangerMinutes = responseAlertsEnabled
      ? Number(responseAlertDangerMinutesRaw || 0)
      : null

    const maxSimultaneousValue = maxSimultaneousPerAgent ?? 0
    const inactiveCloseValue = inactiveCloseMinutes ?? 0
    const responseAlertWarningValue = responseAlertWarningMinutes ?? 0
    const responseAlertDangerValue = responseAlertDangerMinutes ?? 0

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

    if (responseAlertsEnabled && (!Number.isInteger(responseAlertWarningValue) || responseAlertWarningValue < 1)) {
      return NextResponse.json(
        { ok: false, error: "Alerta amarelo deve ser um inteiro maior que zero" },
        { status: 400 }
      )
    }

    if (responseAlertsEnabled && (!Number.isInteger(responseAlertDangerValue) || responseAlertDangerValue < 1)) {
      return NextResponse.json(
        { ok: false, error: "Alerta vermelho deve ser um inteiro maior que zero" },
        { status: 400 }
      )
    }

    if (responseAlertsEnabled && responseAlertDangerValue <= responseAlertWarningValue) {
      return NextResponse.json(
        { ok: false, error: "Alerta vermelho deve ser maior que alerta amarelo" },
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
      response_alerts_enabled: responseAlertsEnabled,
      response_alert_warning_minutes: responseAlertWarningMinutes,
      response_alert_danger_minutes: responseAlertDangerMinutes,
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

    return NextResponse.json({
      ok: true,
      data: normalizeSettingsRow(connectionId, (data as Record<string, unknown>) ?? null)
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao salvar configuracoes"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
