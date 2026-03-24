// app/api/meta/embedded-signup/config/route.ts

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const appId = process.env.META_APP_ID
    const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID
    const apiVersion = process.env.META_GRAPH_VERSION || 'v23.0'

    if (!appId) {
      return NextResponse.json({ ok: false, error: 'META_APP_ID não configurado' }, { status: 500 })
    }

    if (!configId) {
      return NextResponse.json(
        { ok: false, error: 'META_EMBEDDED_SIGNUP_CONFIG_ID não configurado' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      appId,
      configId,
      apiVersion
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar configuração' },
      { status: 500 }
    )
  }
}