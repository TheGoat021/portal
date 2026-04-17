import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type LeadStatus = "novo" | "em_contato" | "proposta" | "ganho" | "perdido"

const DEFAULT_LEAD_STATUS: LeadStatus = "novo"

function normalizeLeadRow(lead: any) {
  return {
    ...lead,
    status: (lead.status as LeadStatus) || DEFAULT_LEAD_STATUS,
    cliente: lead.cliente ?? {
      id: "",
      nome: "Cliente não informado",
      telefone: "",
      email: null
    },
    origem: lead.origem ?? {
      id: "",
      nome: "Sem origem",
      plataforma: null
    }
  }
}

/**
 * LISTAR LEADS (PIPELINE)
 */
export async function GET(req: NextRequest) {
  const status = (req.nextUrl.searchParams.get("status") || "").trim() as LeadStatus | ""
  const limitParam = Number.parseInt(req.nextUrl.searchParams.get("limit") || "0", 10)
  const offsetParam = Number.parseInt(req.nextUrl.searchParams.get("offset") || "0", 10)
  const hasPagination = Number.isFinite(limitParam) && limitParam > 0
  const limit = hasPagination ? Math.min(Math.max(limitParam, 1), 200) : 0
  const offset = hasPagination ? Math.max(offsetParam, 0) : 0
  const validStatus = ["novo", "em_contato", "proposta", "ganho", "perdido"].includes(status)

  let query = supabaseAdmin
    .from("leads")
    .select(`
      id,
      conversation_id,
      status,
      created_at,
      cliente:clientes (
        id,
        nome,
        telefone,
        email
      ),
      origem:origens (
        id,
        nome,
        plataforma
      )
    `)
    .order("created_at", { ascending: false })

  if (validStatus) {
    query = query.eq("status", status)
  }

  if (hasPagination) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalized = (data ?? []).map(normalizeLeadRow)
  if (!hasPagination) {
    return NextResponse.json(normalized)
  }

  let countQuery = supabaseAdmin.from("leads").select("id", { count: "exact", head: true })
  if (validStatus) {
    countQuery = countQuery.eq("status", status)
  }

  const { count, error: countError } = await countQuery
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  return NextResponse.json({
    data: normalized,
    pagination: {
      total: Number(count ?? 0),
      limit,
      offset,
      hasMore: offset + normalized.length < Number(count ?? 0)
    }
  })
}

/**
 * CRIAR LEAD
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nome, telefone, email, origem_id, conversation_id } = body

    if (!nome || !telefone || !origem_id) {
      return NextResponse.json(
        { error: "nome, telefone e origem_id são obrigatórios" },
        { status: 400 }
      )
    }

    const { data: origem, error: origemError } = await supabaseAdmin
      .from("origens")
      .select("id, nome, plataforma")
      .eq("id", origem_id)
      .single()

    if (origemError || !origem) {
      return NextResponse.json({ error: "Origem inválida" }, { status: 400 })
    }

    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from("clientes")
      .insert({
        nome,
        telefone,
        email: email || null
      })
      .select(`
        id,
        nome,
        telefone,
        email
      `)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json(
        { error: clienteError?.message || "Erro ao criar cliente" },
        { status: 500 }
      )
    }

    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .insert({
        cliente_id: cliente.id,
        origem_id: origem.id,
        conversation_id: conversation_id || null,
        status: DEFAULT_LEAD_STATUS,
        plataforma: "manual"
      })
      .select(`
        id,
        conversation_id,
        status,
        created_at,
        cliente:clientes (
          id,
          nome,
          telefone,
          email
        ),
        origem:origens (
          id,
          nome,
          plataforma
        )
      `)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: leadError?.message || "Erro ao criar lead" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...lead,
      status: (lead.status as LeadStatus) || DEFAULT_LEAD_STATUS,
      cliente: lead.cliente ?? {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email
      },
      origem: lead.origem ?? {
        id: origem.id,
        nome: origem.nome,
        plataforma: origem.plataforma
      }
    })
  } catch (error) {
    console.error("Erro ao criar lead:", error)

    return NextResponse.json({ error: "Erro interno ao criar lead" }, { status: 500 })
  }
}
