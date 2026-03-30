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

type BusinessResponse = {
  id?: string
  name?: string
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

type WabaPhoneNumber = {
  id: string
  verified_name?: string
  display_phone_number?: string
  quality_rating?: string
}

type PhoneCandidate = {
  id: string
  display_phone_number?: string | null
  verified_name?: string | null
  quality_rating?: string | null
  waba_id: string
  business_id: string | null
}

type WabaPhoneNumbersResponse = {
  data?: WabaPhoneNumber[]
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

type Body = {
  code: string
  wabaId?: string | null
  phoneNumberId?: string | null
  businessId?: string | null
  pin?: string | null
  companyId?: string | null
  profileId?: string | null
  rawEvent?: any
}

function firstNonEmpty<T>(...values: Array<T | null | undefined | ''>) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return null
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
    cache: 'no-store'
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
    cache: 'no-store'
  })

  const data = (await res.json()) as DebugTokenResponse

  if (!res.ok || !data?.data?.is_valid) {
    throw new Error(data?.error?.message || 'Erro ao validar token da Meta')
  }

  return data
}

function extractBusinessIdFromRawEvent(rawEvent: any) {
  return firstNonEmpty(
    rawEvent?.businessId,
    rawEvent?.business_id,
    rawEvent?.data?.businessId,
    rawEvent?.data?.business_id,
    rawEvent?.sessionInfo?.businessId,
    rawEvent?.sessionInfo?.business_id,
    rawEvent?.extras?.businessId,
    rawEvent?.extras?.business_id
  )
}

function extractWabaIdFromRawEvent(rawEvent: any) {
  return firstNonEmpty(
    rawEvent?.wabaId,
    rawEvent?.waba_id,
    rawEvent?.data?.wabaId,
    rawEvent?.data?.waba_id,
    rawEvent?.sessionInfo?.wabaId,
    rawEvent?.sessionInfo?.waba_id,
    rawEvent?.extras?.wabaId,
    rawEvent?.extras?.waba_id,
    rawEvent?.whatsapp_business_account?.id
  )
}

function extractPhoneNumberIdFromRawEvent(rawEvent: any) {
  return firstNonEmpty(
    rawEvent?.phoneNumberId,
    rawEvent?.phone_number_id,
    rawEvent?.data?.phoneNumberId,
    rawEvent?.data?.phone_number_id,
    rawEvent?.sessionInfo?.phoneNumberId,
    rawEvent?.sessionInfo?.phone_number_id,
    rawEvent?.extras?.phoneNumberId,
    rawEvent?.extras?.phone_number_id
  )
}

async function getBusinesses(token: string) {
  const url = new URL(`${GRAPH_BASE}/me/businesses`)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = (await res.json()) as {
    data?: BusinessResponse[]
    error?: { message?: string }
  }

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao buscar businesses')
  }

  return Array.isArray(data?.data) ? data.data : []
}

async function getOwnedWabasFromBusiness(businessId: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${businessId}/owned_whatsapp_business_accounts`)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = (await res.json()) as WabaListResponse

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao buscar WABAs do business')
  }

  return data?.data ?? []
}

async function getClientWabasFromBusiness(businessId: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${businessId}/client_whatsapp_business_accounts`)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = (await res.json()) as WabaListResponse

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao buscar client WABAs do business')
  }

  return data?.data ?? []
}

async function getAllWabaPhoneNumbers(wabaId: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${wabaId}/phone_numbers`)
  url.searchParams.set(
    'fields',
    'id,display_phone_number,verified_name,quality_rating'
  )

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = (await res.json()) as WabaPhoneNumbersResponse

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao buscar números do WABA')
  }

  return Array.isArray(data?.data) ? data.data : []
}

async function discoverPhoneCandidates(
  token: string,
  explicitBusinessId?: string | null,
  explicitWabaId?: string | null
) {
  const businesses = await getBusinesses(token)

  const businessList = explicitBusinessId
    ? businesses.filter((b) => b.id === explicitBusinessId)
    : businesses

  const candidates: PhoneCandidate[] = []

  for (const business of businessList) {
    if (!business.id) continue

    const owned = await getOwnedWabasFromBusiness(business.id, token).catch(() => [])
    const client = await getClientWabasFromBusiness(business.id, token).catch(() => [])

    const mergedWabas = [...owned, ...client]
    const uniqueWabas = Array.from(
      new Map(mergedWabas.map((w) => [w.id, w])).values()
    )

    const wabaList = explicitWabaId
      ? uniqueWabas.filter((w) => w.id === explicitWabaId)
      : uniqueWabas

    for (const waba of wabaList) {
      const phones = await getAllWabaPhoneNumbers(waba.id, token).catch(() => [])

      for (const phone of phones) {
        candidates.push({
          id: phone.id,
          display_phone_number: phone.display_phone_number ?? null,
          verified_name: phone.verified_name ?? null,
          quality_rating: phone.quality_rating ?? null,
          waba_id: waba.id,
          business_id: business.id
        })
      }
    }
  }

  return candidates
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
  const body: Record<string, string> = {
    messaging_product: 'whatsapp'
  }

  if (pin?.trim()) {
    body.pin = pin.trim()
  }

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
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = (await res.json()) as PhoneInfoResponse

  if (!res.ok || !data?.id) {
    throw new Error(data?.error?.message || 'Erro ao buscar telefone')
  }

  return data
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
    const debug = await debugToken(businessToken)
    const rawEvent = body.rawEvent ?? null

    const explicitBusinessId =
      firstNonEmpty(body.businessId, extractBusinessIdFromRawEvent(rawEvent)) ?? null

    const explicitWabaId =
      firstNonEmpty(body.wabaId, extractWabaIdFromRawEvent(rawEvent)) ?? null

    const explicitPhoneNumberId =
      firstNonEmpty(body.phoneNumberId, extractPhoneNumberIdFromRawEvent(rawEvent)) ?? null

    console.log('FINALIZE INPUT BODY:', JSON.stringify(body, null, 2))
    console.log('DEBUG TOKEN:', JSON.stringify(debug, null, 2))
    console.log('EXPLICIT IDS:', {
      explicitBusinessId,
      explicitWabaId,
      explicitPhoneNumberId
    })

    const candidates = await discoverPhoneCandidates(
      businessToken,
      explicitBusinessId,
      explicitWabaId
    )

    console.log('DISCOVERED PHONE CANDIDATES:', JSON.stringify(candidates, null, 2))

    let selected: PhoneCandidate | null = null

    if (explicitPhoneNumberId) {
      selected = candidates.find((item) => item.id === explicitPhoneNumberId) ?? null

      if (!selected) {
        return NextResponse.json(
          { ok: false, error: 'Número selecionado não pertence aos ativos encontrados para este token' },
          { status: 400 }
        )
      }
    } else {
      if (candidates.length === 1) {
        selected = candidates[0]
      } else if (candidates.length > 1) {
        return NextResponse.json({
          ok: true,
          needs_phone_selection: true,
          phoneNumbers: candidates
        })
      }
    }

    if (!selected) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Não foi possível descobrir automaticamente o WABA e o número para este token. Verifique se o usuário concluiu o Embedded Signup na mesma Business e se o token tem acesso aos ativos.'
        },
        { status: 400 }
      )
    }

    await subscribeApp(selected.waba_id, businessToken)
    await registerPhone(selected.id, businessToken, body.pin ?? null)

    const phone = await getPhoneInfo(selected.id, businessToken)

    const payload = {
      company_id: body.companyId ?? null,
      profile_id: body.profileId ?? null,
      status: 'connected',
      provider: 'meta',
      waba_id: selected.waba_id,
      phone_number_id: selected.id,
      business_id: selected.business_id,
      display_phone_number: phone?.display_phone_number ?? selected.display_phone_number ?? null,
      verified_name: phone?.verified_name ?? selected.verified_name ?? null,
      quality_rating: phone?.quality_rating ?? selected.quality_rating ?? null,
      code: body.code,
      business_token: businessToken,
      webhook_verified: true,
      metadata: {
        rawEvent,
        exchange: exchanged,
        debug_token: debug,
        discovered_candidates: candidates,
        finalize_received_at: new Date().toISOString(),
        connected_without_webhook_wait: true
      }
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
      pending: false,
      connection: data,
      resolved: {
        wabaId: selected.waba_id,
        phoneNumberId: selected.id,
        businessId: selected.business_id
      }
    })
  } catch (error: any) {
    console.error('FINALIZE META ERROR:', error)

    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao finalizar conexão' },
      { status: 500 }
    )
  }
}