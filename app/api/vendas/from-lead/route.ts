import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const { lead_id, valor, produto } = await req.json()

  if (!lead_id || !valor || Number(valor) <= 0) {
    return NextResponse.json(
      { error: 'lead_id e valor são obrigatórios' },
      { status: 400 }
    )
  }

  // 1️⃣ Buscar lead
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('id, cliente_id, origem_id, status')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
  }

  if (lead.status === 'ganho') {
    return NextResponse.json(
      { error: 'Lead já foi convertido em venda' },
      { status: 400 }
    )
  }

  // 2️⃣ Criar venda
  const { error: vendaError } = await supabaseAdmin
    .from('vendas')
    .insert({
      cliente_id: lead.cliente_id,
      origem_id: lead.origem_id,
      valor: Number(valor),
      produto,
      plataforma: 'manual'
    })

  if (vendaError) {
    return NextResponse.json(
      { error: vendaError.message },
      { status: 500 }
    )
  }

  // 3️⃣ Atualizar lead
  await supabaseAdmin
    .from('leads')
    .update({ status: 'ganho' })
    .eq('id', lead.id)

  return NextResponse.json({ success: true })
}
