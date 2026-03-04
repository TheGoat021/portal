import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * LISTAR ORIGENS
 */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('origens')
    .select('id, nome, plataforma')
    .order('nome')

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data ?? [])
}
