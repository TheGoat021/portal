import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

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

type PhoneCandidate = {
  id: string
  display_phone_number?: string | null
  verified_name?: string | null
  quality_rating?: string | null
  waba_id: string
  business_id: string | null
  source: 'explicit' | 'debug_token' | 'business_lookup'
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function getDebugScopeTargetIds(
  debug: DebugTokenResponse,
  scopes: string[]
) {
  const granularScopes = debug?.data?.granular_scopes ?? []

  return uniqueStrings(
    granularScopes
      .filter((item) => item?.scope && scopes.includes(item.scope))
      .flatMap((item) => item?.target_ids ?? [])
  )
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
    throw new Error(
      data?.error?.message || 'Erro ao buscar owned_whatsapp_business_accounts'
    )
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
    throw new Error(
      data?.error?.message || 'Erro ao buscar client_whatsapp_business_accounts'
    )
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

async function discoverCandidates(params: {
  token: string
  explicitBusinessId: string | null
  explicitWabaId: string | null
}) {
  const { token, explicitBusinessId, explicitWabaId } = params

  const debug = await debugToken(token)

  const candidates: PhoneCandidate[] = []
  const discoveryLog: Record<string, any> = {
    explicitBusinessId,
    explicitWabaId,
    businesses: [],
    debugBusinessTargetIds: [],
    debugWabaTargetIds: [],
    triedWabas: [],
    errors: []
  }

  const debugBusinessIds = getDebugScopeTargetIds(debug, ['business_management'])
  const debugWabaIds = getDebugScopeTargetIds(debug, [
    'whatsapp_business_management',
    'whatsapp_business_messaging'
  ])

  discoveryLog.debugBusinessTargetIds = debugBusinessIds
  discoveryLog.debugWabaTargetIds = debugWabaIds

  const businesses = await getBusinesses(token).catch((error: any) => {
    discoveryLog.errors.push({
      step: 'getBusinesses',
      message: error?.message || String(error)
    })
    return []
  })

  discoveryLog.businesses = businesses

  const businessIdsToTry = uniqueStrings([
    explicitBusinessId,
    ...businesses.map((b) => b.id ?? null),
    ...debugBusinessIds
  ])

  const wabaMap = new Map<
    string,
    { business_id: string | null; source: PhoneCandidate['source'] }
  >()

  if (explicitWabaId) {
    wabaMap.set(explicitWabaId, {
      business_id: explicitBusinessId ?? null,
      source: 'explicit'
    })
  }

  for (const debugWabaId of debugWabaIds) {
    if (!wabaMap.has(debugWabaId)) {
      wabaMap.set(debugWabaId, {
        business_id: explicitBusinessId ?? null,
        source: 'debug_token'
      })
    }
  }

  for (const businessId of businessIdsToTry) {
    const owned = await getOwnedWabasFromBusiness(businessId, token).catch((error: any) => {
      discoveryLog.errors.push({
        step: 'getOwnedWabasFromBusiness',
        businessId,
        message: error?.message || String(error)
      })
      return []
    })

    const client = await getClientWabasFromBusiness(businessId, token).catch((error: any) => {
      discoveryLog.errors.push({
        step: 'getClientWabasFromBusiness',
        businessId,
        message: error?.message || String(error)
      })
      return []
    })

    for (const waba of [...owned, ...client]) {
      if (!wabaMap.has(waba.id)) {
        wabaMap.set(waba.id, {
          business_id: businessId,
          source: 'business_lookup'
        })
      }
    }
  }

  for (const [wabaId, meta] of wabaMap.entries()) {
    discoveryLog.triedWabas.push({
      wabaId,
      businessId: meta.business_id,
      source: meta.source
    })

    const phones = await getAllWabaPhoneNumbers(wabaId, token).catch((error: any) => {
      discoveryLog.errors.push({
        step: 'getAllWabaPhoneNumbers',
        wabaId,
        message: error?.message || String(error)
      })
      return []
    })

    for (const phone of phones) {
      candidates.push({
        id: phone.id,
        display_phone_number: phone.display_phone_number ?? null,
        verified_name: phone.verified_name ?? null,
        quality_rating: phone.quality_rating ?? null,
        waba_id: wabaId,
        business_id: meta.business_id,
        source: meta.source
      })
    }
  }

  const uniqueCandidates = Array.from(
    new Map(candidates.map((item) => [item.id, item])).values()
  )

  return {
    candidates: uniqueCandidates,
    discoveryLog,
    debug
  }
}

async function reconcilePendingConnection(connection: any) {
  const currentMetadata =
    connection.metadata && typeof connection.metadata === 'object'
      ? connection.metadata
      : {}

  if (!connection.business_token) {
    return {
      connectionId: connection.id,
      updated: false,
      reason: 'missing_business_token'
    }
  }

  const { candidates, discoveryLog, debug } = await discoverCandidates({
    token: connection.business_token,
    explicitBusinessId: connection.business_id ?? null,
    explicitWabaId: connection.waba_id ?? null
  })

  if (!candidates.length) {
    await supabaseAdmin
      .from('whatsapp_meta_connections')
      .update({
        metadata: {
          ...currentMetadata,
          reconcile_last_run_at: new Date().toISOString(),
          reconcile_last_result: 'no_candidates_found',
          reconcile_discovery_log: discoveryLog,
          reconcile_debug_token: debug
        }
      })
      .eq('id', connection.id)

    return {
      connectionId: connection.id,
      updated: false,
      reason: 'no_candidates_found',
      discoveryLog
    }
  }

  const selected =
    candidates.find((item) => item.id === connection.phone_number_id) ??
    candidates[0]

  await subscribeApp(selected.waba_id, connection.business_token)
  await registerPhone(
    selected.id,
    connection.business_token,
    currentMetadata?.pin ?? null
  )

  const phone = await getPhoneInfo(selected.id, connection.business_token)

  const { error: updateError } = await supabaseAdmin
    .from('whatsapp_meta_connections')
    .update({
      status: 'connected',
      waba_id: selected.waba_id,
      phone_number_id: selected.id,
      business_id: selected.business_id,
      display_phone_number:
        phone?.display_phone_number ?? selected.display_phone_number ?? null,
      verified_name:
        phone?.verified_name ?? selected.verified_name ?? null,
      quality_rating:
        phone?.quality_rating ?? selected.quality_rating ?? null,
      webhook_verified: true,
      metadata: {
        ...currentMetadata,
        reconcile_last_run_at: new Date().toISOString(),
        reconcile_last_result: 'connected',
        reconcile_selected_candidate: selected,
        reconcile_discovery_log: discoveryLog,
        reconcile_debug_token: debug
      }
    })
    .eq('id', connection.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  return {
    connectionId: connection.id,
    updated: true,
    selected
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.META_RECONCILE_SECRET

    if (cronSecret) {
      const expected = `Bearer ${cronSecret}`
      if (authHeader !== expected) {
        return NextResponse.json(
          { ok: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const { data: pendingConnections, error } = await supabaseAdmin
      .from('whatsapp_meta_connections')
      .select('*')
      .eq('provider', 'meta')
      .eq('status', 'pending_waba')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    const results: any[] = []

    for (const connection of pendingConnections ?? []) {
      try {
        const result = await reconcilePendingConnection(connection)
        results.push(result)
      } catch (err: any) {
        results.push({
          connectionId: connection.id,
          updated: false,
          reason: err?.message || 'unknown_error'
        })
      }
    }

    return NextResponse.json({
      ok: true,
      total: pendingConnections?.length ?? 0,
      results
    })
  } catch (error: any) {
    console.error('META RECONCILE ERROR:', error)

    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao reconciliar conexões Meta' },
      { status: 500 }
    )
  }
}