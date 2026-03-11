import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('origens')
      .select('id, nome, plataforma')
      .order('nome', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Erro ao buscar origens:', error)

    return NextResponse.json(
      { error: 'Erro interno ao buscar origens' },
      { status: 500 }
    )
  }
}