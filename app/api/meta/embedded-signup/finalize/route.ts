// app/api/meta/embedded-signup/finalize/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

async function exchangeCode(code: string) {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET
  const redirectUri = process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI

  if (!clientId || !clientSecret) {
    throw new Error('META_APP_ID ou META_APP_SECRET não configurados')
  }

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('code', code)
  if (redirectUri) url.searchParams.set('redirect_uri', redirectUri)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const data = await res.json()

  if (!res.ok || !data?.access_token) {
    throw new Error(data?.error?.message || 'Erro ao trocar code por token')
  }

  return data
}

async function subscribeApp(wabaId: string, token: string) {
  const res = await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao vincular app no WABA')
  }

  return data
}

async function registerPhone(phoneNumberId: string, token: string, pin?: string | null) {
  const body: any = { messaging_product: 'whatsapp' }
  if (pin?.trim()) body.pin = pin.trim()

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao registrar número')
  }

  return data
}

async function getPhoneInfo(phoneNumberId: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${phoneNumberId}`)
  url.searchParams.set('fields', 'id,display_phone_number,verified_name,quality_rating')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao buscar telefone')
  }

  return data
}

type Body = {
  code: string
  wabaId: string
  phoneNumberId: string
  businessId?: string | null
  pin?: string | null
  companyId?: string | null
  profileId?: string | null
  rawEvent?: unknown
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body

    if (!body.code || !body.wabaId || !body.phoneNumberId) {
      return NextResponse.json(
        { error: 'code, wabaId e phoneNumberId são obrigatórios' },
        { status: 400 }
      )
    }

    const exchanged = await exchangeCode(body.code)
    const businessToken = exchanged.access_token

    await subscribeApp(body.wabaId, businessToken)
    await registerPhone(body.phoneNumberId, businessToken, body.pin ?? null)

    const phone = await getPhoneInfo(body.phoneNumberId, businessToken)

    const payload = {
      company_id: body.companyId ?? null,
      profile_id: body.profileId ?? null,
      status: 'connected',
      provider: 'meta',
      waba_id: body.wabaId,
      phone_number_id: body.phoneNumberId,
      business_id: body.businessId ?? null,
      display_phone_number: phone?.display_phone_number ?? null,
      verified_name: phone?.verified_name ?? null,
      quality_rating: phone?.quality_rating ?? null,
      code: body.code,
      business_token: businessToken,
      webhook_verified: true,
      metadata: {
        rawEvent: body.rawEvent ?? null,
        exchange: exchanged
      }
    }

    const { data, error } = await supabaseAdmin
      .from('whatsapp_meta_connections')
      .upsert(payload, { onConflict: 'phone_number_id' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      connection: data
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao finalizar conexão' },
      { status: 500 }
    )
  }
}