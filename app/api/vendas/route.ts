import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// UUID válido da origem manual
const ORIGEM_MANUAL_ID = 'b908026c-d5ea-4fd5-9bc9-92ca9e8287ba'

/**
 * LISTAR VENDAS
 */
export async function GET(req: Request) {
  try {
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
        data_fechamento,
        cliente_id,
        cliente:clientes (
          nome,
          telefone,
          email,
          endereco,
          cpf,
          vendedor
        ),
        origem:origens (
          id,
          nome
        )
      `)
      .order('data_fechamento', { ascending: false })

    if (startDate) {
      query = query.gte('data_fechamento', `${startDate}T00:00:00`)
    }

    if (endDate) {
      query = query.lte('data_fechamento', `${endDate}T23:59:59`)
    }

    if (origemId) {
      query = query.eq('origem_id', origemId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const vendas = data ?? []

    const total = vendas.reduce(
      (sum, v: any) => sum + Number(v.valor ?? 0),
      0
    )

    return NextResponse.json({
      vendas,
      total,
      quantidade: vendas.length
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * CRIAR VENDA MANUAL
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      cliente_id,
      valor,
      produto,
      origem_id,
      endereco,
      cpf,
      telefone,
      email,
      vendedor
    } = body

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

    const clienteUpdates: Record<string, any> = {}

    if (endereco !== undefined) clienteUpdates.endereco = endereco || null
    if (cpf !== undefined) clienteUpdates.cpf = cpf || null
    if (telefone !== undefined) clienteUpdates.telefone = telefone || null
    if (email !== undefined) clienteUpdates.email = email || null
    if (vendedor !== undefined) clienteUpdates.vendedor = vendedor || null

    if (Object.keys(clienteUpdates).length > 0) {
      const { error: clienteError } = await supabaseAdmin
        .from('clientes')
        .update(clienteUpdates)
        .eq('id', cliente_id)

      if (clienteError) {
        return NextResponse.json(
          { error: clienteError.message },
          { status: 500 }
        )
      }
    }

    const { error: vendaError } = await supabaseAdmin
      .from('vendas')
      .insert({
        cliente_id,
        valor: Number(valor),
        produto,
        origem_id: origem_id ?? ORIGEM_MANUAL_ID,
        plataforma: 'manual'
      })

    if (vendaError) {
      return NextResponse.json(
        { error: vendaError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Erro interno' },
      { status: 500 }
    )
  }
}