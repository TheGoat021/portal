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
    origem_id
  } = body

  const updateData: any = {}

  if (produto !== undefined) updateData.produto = produto
  if (valor !== undefined) updateData.valor = Number(valor)

  if (data_fechamento) {
    updateData.data_fechamento = new Date(data_fechamento)
  }

  if (origem_id !== undefined) {
    updateData.origem_id = origem_id
  }

  const { error } = await supabaseAdmin
    .from('vendas')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
