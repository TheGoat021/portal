import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json()

  if (!id) {
    return NextResponse.json(
      { error: 'ID da venda não informado' },
      { status: 400 }
    )
  }

  const {
    produto,
    valor,
    data_fechamento,
    origem_id,
    telefone,
    email,
    endereco,
    cpf,
    vendedor
  } = body

  /**
   * 1️⃣ Buscar venda para pegar cliente_id
   */
  const { data: venda, error: vendaError } = await supabaseAdmin
    .from('vendas')
    .select('id, cliente_id')
    .eq('id', id)
    .single()

  if (vendaError || !venda) {
    return NextResponse.json(
      { error: 'Venda não encontrada' },
      { status: 404 }
    )
  }

  /**
   * 2️⃣ Atualizar venda
   */
  const updateVenda: any = {}

  if (produto !== undefined) updateVenda.produto = produto
  if (valor !== undefined) updateVenda.valor = Number(valor)

  if (data_fechamento) {
    updateVenda.data_fechamento = new Date(data_fechamento)
  }

  if (origem_id !== undefined) {
    updateVenda.origem_id = origem_id
  }

  if (Object.keys(updateVenda).length > 0) {
    const { error: vendaUpdateError } = await supabaseAdmin
      .from('vendas')
      .update(updateVenda)
      .eq('id', id)

    if (vendaUpdateError) {
      return NextResponse.json(
        { error: vendaUpdateError.message },
        { status: 500 }
      )
    }
  }

  /**
   * 3️⃣ Atualizar dados do cliente
   */
  const updateCliente: any = {}

  if (telefone !== undefined) updateCliente.telefone = telefone
  if (email !== undefined) updateCliente.email = email
  if (endereco !== undefined) updateCliente.endereco = endereco
  if (cpf !== undefined) updateCliente.cpf = cpf
  if (vendedor !== undefined) updateCliente.vendedor = vendedor

  if (Object.keys(updateCliente).length > 0) {
    const { error: clienteError } = await supabaseAdmin
      .from('clientes')
      .update(updateCliente)
      .eq('id', venda.cliente_id)

    if (clienteError) {
      return NextResponse.json(
        { error: clienteError.message },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true })
}