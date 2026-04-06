import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN

type Body = {
  companyId?: string | null
  profileId?: string | null
}

type PhoneInfoResponse = {
  id?: string
  display_phone_number?: string
  verified_name?: string
  quality_rating?: string
  error?: {
    message?: string
  }
}

async function getPhoneInfo(phoneNumberId: string, token: string) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}`)
  url.searchParams.set('fields', 'id,display_phone_number,verified_name,quality_rating')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = (await res.json()) as PhoneInfoResponse

  if (!res.ok || !data?.id) {
    throw new Error(data?.error?.message || 'Erro ao buscar dados do número na Meta')
  }

  return data
}

export async function POST(req: NextRequest) {
  try {
    if (!PHONE_NUMBER_ID) {
      return NextResponse.json(
        { ok: false, error: 'META_PHONE_NUMBER_ID não configurado' },
        { status: 500 }
      )
    }

    if (!ACCESS_TOKEN) {
      return NextResponse.json(
        { ok: false, error: 'META_ACCESS_TOKEN não configurado' },
        { status: 500 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const phone = await getPhoneInfo(PHONE_NUMBER_ID, ACCESS_TOKEN)

    const payload = {
      company_id: body.companyId ?? null,
      profile_id: body.profileId ?? null,
      provider: 'meta',
      status: 'connected',
      waba_id: null,
      phone_number_id: phone.id,
      business_id: null,
      display_phone_number: phone.display_phone_number ?? null,
      verified_name: phone.verified_name ?? null,
      quality_rating: phone.quality_rating ?? null,
      code: null,
      business_token: ACCESS_TOKEN,
      webhook_verified: false
    }

    const { data, error } = await supabaseAdmin
      .from('whatsapp_meta_connections')
      .upsert(payload, { onConflict: 'phone_number_id' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      connection: data
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao salvar conexão da Meta' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    if (!PHONE_NUMBER_ID) {
      return NextResponse.json(
        { ok: false, error: 'META_PHONE_NUMBER_ID não configurado' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('whatsapp_meta_connections')
      .select('*')
      .eq('provider', 'meta')
      .eq('phone_number_id', PHONE_NUMBER_ID)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      connection: data ?? null
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao buscar conexão da Meta' },
      { status: 500 }
    )
  }
}