import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ✅ UUID VÁLIDO DA ORIGEM MANUAL
const ORIGEM_MANUAL_ID = 'b908026c-d5ea-4fd5-9bc9-92ca9e8287ba'

/**
 * LISTAR VENDAS
 */
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
      created_at,
      cliente:clientes (
        nome
      ),
      origem:origens (
        nome
      )
    `)
    .order('created_at', { ascending: false })

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)
  if (origemId) query = query.eq('origem_id', origemId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  const vendas = data ?? []

  const total = vendas.reduce(
    (sum, v: any) => sum + Number(v.valor),
    0
  )

  return NextResponse.json({
    vendas,
    total,
    quantidade: vendas.length
  })
}

/**
 * CRIAR VENDA MANUAL
 */
export async function POST(req: Request) {
  const body = await req.json()
  const { cliente_id, valor, produto, origem_id } = body

  if (!cliente_id) {
    return NextResponse.json(
      { error: 'cliente_id é obrigatório' },
      { status: 400 }
    )
  }

  if (!valor || Number(valor) <= 0) {
    return NextResponse.json(
      { error: 'valor inválido' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('vendas')
    .insert({
      cliente_id,
      valor: Number(valor),
      produto,
      origem_id: origem_id ?? ORIGEM_MANUAL_ID,
      plataforma: 'manual'
    })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
