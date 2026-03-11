import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const allowedStatus = [
  'novo',
  'em_contato',
  'proposta',
  'ganho',
  'perdido'
] as const

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const { status, origem_id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID do lead não informado' },
        { status: 400 }
      )
    }

    if (!status && !origem_id) {
      return NextResponse.json(
        { error: 'Informe ao menos status ou origem_id' },
        { status: 400 }
      )
    }

    if (status && !allowedStatus.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      )
    }

    if (origem_id) {
      const { data: origem, error: origemError } = await supabaseAdmin
        .from('origens')
        .select('id')
        .eq('id', origem_id)
        .maybeSingle()

      if (origemError) {
        return NextResponse.json(
          { error: origemError.message },
          { status: 500 }
        )
      }

      if (!origem) {
        return NextResponse.json(
          { error: 'Origem inválida' },
          { status: 400 }
        )
      }
    }

    const payload: Record<string, any> = {}

    if (status) payload.status = status
    if (origem_id) payload.origem_id = origem_id

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(payload)
      .eq('id', id)
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
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...data,
      cliente: data.cliente ?? {
        id: '',
        nome: 'Cliente não informado',
        telefone: '',
        email: null
      },
      origem: data.origem ?? {
        id: '',
        nome: 'Sem origem',
        plataforma: null
      }
    })
  } catch (error) {
    console.error('Erro ao atualizar lead:', error)

    return NextResponse.json(
      { error: 'Erro interno ao atualizar lead' },
      { status: 500 }
    )
  }
}