import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const STATUS_VALIDOS = [
  'novo',
  'em_contato',
  'proposta',
  'ganho',
  'perdido'
] as const

type StatusLead = typeof STATUS_VALIDOS[number]

/**
 * ATUALIZAR STATUS DO LEAD
 * PATCH /api/leads/:id/status
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const leadId = params.id
  const body = await req.json()
  const { status } = body as { status?: StatusLead }

  // 1️⃣ validações básicas
  if (!leadId) {
    return NextResponse.json(
      { error: 'ID do lead não informado' },
      { status: 400 }
    )
  }

  if (!status || !STATUS_VALIDOS.includes(status)) {
    return NextResponse.json(
      { error: 'Status inválido' },
      { status: 400 }
    )
  }

  // 2️⃣ regra de negócio: não mover se já finalizado
  const { data: leadAtual, error: leadError } =
    await supabaseAdmin
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single()

  if (leadError || !leadAtual) {
    return NextResponse.json(
      { error: 'Lead não encontrado' },
      { status: 404 }
    )
  }

  if (
    leadAtual.status === 'ganho' ||
    leadAtual.status === 'perdido'
  ) {
    return NextResponse.json(
      { error: 'Lead já finalizado' },
      { status: 409 }
    )
  }

  // 3️⃣ atualizar status
  const { data, error } = await supabaseAdmin
    .from('leads')
    .update({ status })
    .eq('id', leadId)
    .select(`
      id,
      status,
      created_at,
      cliente:clientes (
        id,
        nome,
        telefone
      ),
      origem:origens (
        id,
        nome,
        plataforma
      )
    `)
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
