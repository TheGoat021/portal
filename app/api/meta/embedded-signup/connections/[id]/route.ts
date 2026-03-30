import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'id é obrigatório' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('whatsapp_meta_connections')
      .select(`
        id,
        status,
        provider,
        waba_id,
        phone_number_id,
        business_id,
        display_phone_number,
        verified_name,
        quality_rating,
        webhook_verified,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Conexão não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      connection: data
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao buscar conexão' },
      { status: 500 }
    )
  }
}