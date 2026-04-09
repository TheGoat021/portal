import { NextRequest, NextResponse } from "next/server"
import { getAgentAvailability, setAgentAvailability } from "@/lib/metaQueueDistribution"

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
    const userId = String(url.searchParams.get("userId") || "")

    if (!connectionId || !userId) {
      return NextResponse.json(
        { ok: false, error: "connectionId e userId sao obrigatorios" },
        { status: 400 }
      )
    }

    const isActive = await getAgentAvailability({ connectionId, userId })
    return NextResponse.json({ ok: true, data: { isActive } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar disponibilidade"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const connectionId = String(body?.connectionId || "")
    const userId = String(body?.userId || "")
    const userRole = String(body?.userRole || "")
    const isActive = Boolean(body?.isActive)

    if (!connectionId || !userId || !userRole) {
      return NextResponse.json(
        { ok: false, error: "connectionId, userId e userRole sao obrigatorios" },
        { status: 400 }
      )
    }

    if (isManagerRole(userRole)) {
      return NextResponse.json(
        { ok: false, error: "Perfil de gestao nao participa da distribuicao automatica" },
        { status: 400 }
      )
    }

    const data = await setAgentAvailability({
      connectionId,
      userId,
      isActive,
      updatedByUserId: userId
    })

    return NextResponse.json({ ok: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar disponibilidade"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

