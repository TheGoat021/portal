// app/api/meta/embedded-signup/finalize/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

async function exchangeCode(code: string) {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`)

  url.searchParams.set('client_id', process.env.META_APP_ID!)
  url.searchParams.set('client_secret', process.env.META_APP_SECRET!)
  url.searchParams.set('code', code)

  const res = await fetch(url.toString())
  const data = await res.json()

  if (!data?.access_token) {
    throw new Error(data?.error?.message || 'Erro ao trocar code')
  }

  return data.access_token
}

async function getBusinesses(token: string) {
  const res = await fetch(`${GRAPH_BASE}/me/businesses`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  const data = await res.json()

  if (!data?.data?.length) {
    throw new Error('Nenhum Business encontrado')
  }

  return data.data[0].id
}

async function getWaba(businessId: string, token: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${businessId}/owned_whatsapp_business_accounts`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )

  const data = await res.json()

  if (!data?.data?.length) {
    throw new Error('Nenhum WABA encontrado')
  }

  return data.data[0].id
}

async function getPhoneNumber(wabaId: string, token: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${wabaId}/phone_numbers`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )

  const data = await res.json()

  if (!data?.data?.length) {
    throw new Error('Nenhum número encontrado')
  }

  return data.data[0]
}

async function subscribeApp(wabaId: string, token: string) {
  await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function POST(req: NextRequest) {
  try {
    const { code, pin } = await req.json()

    if (!code) {
      return NextResponse.json({ error: 'code obrigatório' }, { status: 400 })
    }

    // 1. troca code por token
    const token = await exchangeCode(code)

    // 2. pega business
    const businessId = await getBusinesses(token)

    // 3. pega waba
    const wabaId = await getWaba(businessId, token)

    // 4. pega número
    const phone = await getPhoneNumber(wabaId, token)

    const phoneNumberId = phone.id

    // 5. registra número
    await fetch(`${GRAPH_BASE}/${phoneNumberId}/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: pin || undefined
      })
    })

    // 6. subscribe webhook
    await subscribeApp(wabaId, token)

    // 7. salva no banco
    const { data, error } = await supabaseAdmin
      .from('whatsapp_meta_connections')
      .upsert({
        status: 'connected',
        provider: 'meta',
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        business_id: businessId,
        display_phone_number: phone.display_phone_number,
        verified_name: phone.verified_name,
        quality_rating: phone.quality_rating,
        business_token: token
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({
      ok: true,
      connection: data
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    )
  }
}