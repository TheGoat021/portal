import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * LISTAR LEADS (PIPELINE)
 */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('leads')
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
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    (data ?? []).map(lead => ({
      ...lead,
      cliente: lead.cliente ?? {
        nome: 'Cliente não informado',
        telefone: ''
      }
    }))
  )
}

/**
 * CRIAR LEAD
 */
export async function POST(req: Request) {
  const body = await req.json()
  const { nome, telefone, origem_id } = body

  if (!nome || !telefone || !origem_id) {
    return NextResponse.json(
      { error: 'nome, telefone e origem_id são obrigatórios' },
      { status: 400 }
    )
  }

  /** 1️⃣ Buscar origem */
  const { data: origem, error: origemError } = await supabaseAdmin
    .from('origens')
    .select('id')
    .eq('id', origem_id)
    .single()

  if (origemError || !origem) {
    return NextResponse.json(
      { error: 'Origem inválida' },
      { status: 400 }
    )
  }

  /** 2️⃣ Criar cliente */
  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from('clientes')
    .insert({
      nome,
      telefone
    })
    .select()
    .single()

  if (clienteError) {
    return NextResponse.json(
      { error: clienteError.message },
      { status: 500 }
    )
  }

  /** 3️⃣ Criar lead */
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .insert({
      cliente_id: cliente.id,
      origem_id: origem.id,
      status: 'novo',
      plataforma: 'manual'
    })
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

  if (leadError) {
    return NextResponse.json(
      { error: leadError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(lead)
}
