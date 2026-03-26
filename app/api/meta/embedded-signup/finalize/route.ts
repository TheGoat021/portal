// app/api/meta/embedded-signup/finalize/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

type ExchangeCodeResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: {
    message?: string
  }
}

type DebugTokenResponse = {
  data?: {
    app_id?: string
    type?: string
    application?: string
    expires_at?: number
    is_valid?: boolean
    issued_at?: number
    scopes?: string[]
    granular_scopes?: Array<{
      scope?: string
      target_ids?: string[]
    }>
    user_id?: string
  }
  error?: {
    message?: string
  }
}

type WabaListResponse = {
  data?: Array<{
    id: string
    name?: string
  }>
  error?: {
    message?: string
  }
}

type WabaPhoneNumbersResponse = {
  data?: Array<{
    id: string
    verified_name?: string
    display_phone_number?: string
    quality_rating?: string
  }>
  error?: {
    message?: string
  }
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

async function exchangeCode(code: string) {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('META_APP_ID ou META_APP_SECRET não configurados')
  }

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('code', code)

  const res = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
  })

  const data = (await res.json()) as ExchangeCodeResponse

  if (!res.ok || !data?.access_token) {
    throw new Error(data?.error?.message || 'Erro ao trocar code por token')
  }

  return data
}

async function debugToken(inputToken: string) {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error('META_APP_ID ou META_APP_SECRET não configurados')
  }

  const appAccessToken = `${appId}|${appSecret}`

  const url = new URL(`${GRAPH_BASE}/debug_token`)
  url.searchParams.set('input_token', inputToken)
  url.searchParams.set('access_token', appAccessToken)

  const res = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
  })

  const data = (await res.json()) as DebugTokenResponse

  if (!res.ok || !data?.data?.is_valid) {
    throw new Error(data?.error?.message || 'Erro ao validar token da Meta')
  }

  return data
}

function extractWabaIdFromDebug(debug: DebugTokenResponse) {
  const granularScopes = debug?.data?.granular_scopes ?? []

  console.log('GRANULAR SCOPES:', JSON.stringify(granularScopes, null, 2))

  for (const scope of granularScopes) {
    if (
      scope?.scope === 'whatsapp_business_management' ||
      scope?.scope === 'business_management'
    ) {
      const targets = scope?.target_ids ?? []
      if (targets.length > 0) {
        return targets[0]
      }
    }
  }

  for (const scope of granularScopes) {
    const targets = scope?.target_ids ?? []
    if (targets.length > 0) {
      return targets[0]
    }
  }

  return null
}

async function getOwnedWabasFromBusiness(businessId: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${businessId}/owned_whatsapp_business_accounts`)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  const data = (await res.json()) as WabaListResponse

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao buscar WABAs do Business')
  }

  return data?.data ?? []
}

async function getWabaPhoneNumbers(wabaId: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${wabaId}/phone_numbers`)
  url.searchParams.set('fields', 'id,display_phone_number,verified_name,quality_rating')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  const data = (await res.json()) as WabaPhoneNumbersResponse

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao buscar números do WABA')
  }

  const firstPhone = data?.data?.[0]
  if (!firstPhone?.id) {
    throw new Error('Nenhum número encontrado para este WABA')
  }

  return {
    list: data,
    phoneNumberId: firstPhone.id,
    displayPhoneNumber: firstPhone.display_phone_number ?? null,
    verifiedName: firstPhone.verified_name ?? null,
    qualityRating: firstPhone.quality_rating ?? null,
  }
}

async function subscribeApp(wabaId: string, token: string) {
  const res = await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao vincular app no WABA')
  }

  return data
}

async function registerPhone(phoneNumberId: string, token: string, pin?: string | null) {
  const body: Record<string, string> = {
    messaging_product: 'whatsapp',
  }

  if (pin?.trim()) {
    body.pin = pin.trim()
  }

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
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
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  const data = (await res.json()) as PhoneInfoResponse

  if (!res.ok || !data?.id) {
    throw new Error(data?.error?.message || 'Erro ao buscar telefone')
  }

  return data
}

type Body = {
  code: string
  wabaId?: string | null
  phoneNumberId?: string | null
  businessId?: string | null
  pin?: string | null
  companyId?: string | null
  profileId?: string | null
  rawEvent?: unknown
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body

    if (!body.code) {
      return NextResponse.json(
        { ok: false, error: 'code é obrigatório' },
        { status: 400 }
      )
    }

    const exchanged = await exchangeCode(body.code)
    const businessToken = exchanged.access_token as string

    let resolvedWabaId = body.wabaId ?? null
    let resolvedPhoneNumberId = body.phoneNumberId ?? null
    const resolvedBusinessId = body.businessId ?? null

    const debug = await debugToken(businessToken)
    console.log('DEBUG_TOKEN_META:', JSON.stringify(debug, null, 2))

    if (!resolvedWabaId) {
      resolvedWabaId = extractWabaIdFromDebug(debug)
    }

    if (!resolvedWabaId && resolvedBusinessId) {
      const wabas = await getOwnedWabasFromBusiness(resolvedBusinessId, businessToken)

      if (wabas.length > 0) {
        resolvedWabaId = wabas[0].id
        console.log(
          'WABA obtido via /{businessId}/owned_whatsapp_business_accounts:',
          resolvedWabaId
        )
      }
    }

    if (!resolvedWabaId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Não foi possível identificar o WABA ID a partir do token retornado pela Meta',
          debug,
        },
        { status: 400 }
      )
    }

    const phoneNumbers = await getWabaPhoneNumbers(resolvedWabaId, businessToken)

    if (!resolvedPhoneNumberId) {
      resolvedPhoneNumberId = phoneNumbers.phoneNumberId
    }

    if (!resolvedPhoneNumberId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Não foi possível identificar o phone_number_id do WABA',
        },
        { status: 400 }
      )
    }

    await subscribeApp(resolvedWabaId, businessToken)
    await registerPhone(resolvedPhoneNumberId, businessToken, body.pin ?? null)

    const phone = await getPhoneInfo(resolvedPhoneNumberId, businessToken)

    const payload = {
      company_id: body.companyId ?? null,
      profile_id: body.profileId ?? null,
      status: 'connected',
      provider: 'meta',
      waba_id: resolvedWabaId,
      phone_number_id: resolvedPhoneNumberId,
      business_id: resolvedBusinessId,
      display_phone_number:
        phone?.display_phone_number ??
        phoneNumbers.displayPhoneNumber ??
        null,
      verified_name:
        phone?.verified_name ??
        phoneNumbers.verifiedName ??
        null,
      quality_rating:
        phone?.quality_rating ??
        phoneNumbers.qualityRating ??
        null,
      code: body.code,
      business_token: businessToken,
      webhook_verified: true,
      metadata: {
        rawEvent: body.rawEvent ?? null,
        exchange: exchanged,
        debug_token: debug,
        phone_numbers: phoneNumbers.list,
      },
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
      connection: data,
      resolved: {
        wabaId: resolvedWabaId,
        phoneNumberId: resolvedPhoneNumberId,
        businessId: resolvedBusinessId,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao finalizar conexão' },
      { status: 500 }
    )
  }
}