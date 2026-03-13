import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const {
      lead_id,
      valor,
      produto,
      endereco,
      cpf,
      telefone,
      email,
      vendedor
    } = await req.json()

    if (!lead_id || !valor || Number(valor) <= 0) {
      return NextResponse.json(
        { error: 'lead_id e valor são obrigatórios' },
        { status: 400 }
      )
    }

    // 1) Buscar lead com vínculo do cliente
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select(`
        id,
        cliente_id,
        origem_id,
        status,
        cliente:clientes (
          id,
          nome,
          telefone,
          email,
          endereco,
          cpf,
          vendedor
        )
      `)
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    if (!lead.cliente_id) {
      return NextResponse.json(
        { error: 'Lead sem cliente vinculado' },
        { status: 400 }
      )
    }

    if (lead.status === 'ganho') {
      return NextResponse.json(
        { error: 'Lead já foi convertido em venda' },
        { status: 400 }
      )
    }

    // 2) Atualizar dados complementares do cliente, se enviados
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
        .eq('id', lead.cliente_id)

      if (clienteError) {
        return NextResponse.json(
          { error: clienteError.message },
          { status: 500 }
        )
      }
    }

    // 3) Criar venda
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

    // 4) Atualizar lead para ganho
    const { error: updateLeadError } = await supabaseAdmin
      .from('leads')
      .update({ status: 'ganho' })
      .eq('id', lead.id)

    if (updateLeadError) {
      return NextResponse.json(
        { error: updateLeadError.message },
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