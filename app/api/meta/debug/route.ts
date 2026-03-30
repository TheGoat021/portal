import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

async function debugToken(token: string) {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  const appAccessToken = `${appId}|${appSecret}`

  const url = new URL(`${GRAPH_BASE}/debug_token`)
  url.searchParams.set('input_token', token)
  url.searchParams.set('access_token', appAccessToken)

  const res = await fetch(url.toString())
  return res.json()
}

async function getBusinesses(token: string) {
  const res = await fetch(`${GRAPH_BASE}/me/businesses`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.json()
}

async function getOwnedWabas(businessId: string, token: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${businessId}/owned_whatsapp_business_accounts`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )
  return res.json()
}

async function getClientWabas(businessId: string, token: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${businessId}/client_whatsapp_business_accounts`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )
  return res.json()
}

async function getPhoneNumbers(wabaId: string, token: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )
  return res.json()
}

export async function GET(req: NextRequest) {
  try {
    const { data: connections } = await supabaseAdmin
      .from('whatsapp_meta_connections')
      .select('*')
      .eq('status', 'pending_waba')
      .limit(5)

    const results = []

    for (const conn of connections || []) {
      const token = conn.business_token

      const debug = await debugToken(token)
      const businesses = await getBusinesses(token)

      const businessDetails: any[] = []

      for (const b of businesses?.data || []) {
        const owned = await getOwnedWabas(b.id, token)
        const client = await getClientWabas(b.id, token)

        const wabas = [...(owned?.data || []), ...(client?.data || [])]

        const wabaDetails: any[] = []

        for (const w of wabas) {
          const phones = await getPhoneNumbers(w.id, token)

          wabaDetails.push({
            wabaId: w.id,
            phones: phones?.data || []
          })
        }

        businessDetails.push({
          businessId: b.id,
          owned,
          client,
          wabas: wabaDetails
        })
      }

      results.push({
        connectionId: conn.id,
        debug,
        businesses,
        businessDetails
      })
    }

    return NextResponse.json({
      ok: true,
      total: results.length,
      results
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    )
  }
}