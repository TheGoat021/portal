import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_meta_connections')
      .select(`
        id,
        company_id,
        profile_id,
        provider,
        status,
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
      .eq('provider', 'meta')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: data ?? []
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao listar conexões Meta' },
      { status: 500 }
    )
  }
}