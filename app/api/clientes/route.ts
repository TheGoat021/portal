import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const origemId = searchParams.get('origemId')

  let query = supabaseAdmin
    .from('vendas')
    .select(`
      id,
      valor,
      produto,
      data_fechamento,
      clientes ( nome ),
      origens ( nome )
    `)
    .order('data_fechamento', { ascending: false })

  if (startDate) query = query.gte('data_fechamento', startDate)
  if (endDate) query = query.lte('data_fechamento', endDate)
  if (origemId) query = query.eq('origem_id', origemId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total = data.reduce((sum, v) => sum + v.valor, 0)

  return NextResponse.json({
    vendas: data,
    total,
    quantidade: data.length
  })
}

export async function POST(req: Request) {
  const body = await req.json()

  const { cliente_id, valor, produto, origem_id } = body

  const { error } = await supabaseAdmin.from('vendas').insert({
    cliente_id,
    valor,
    produto,
    origem_id,
    plataforma: 'manual'
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
