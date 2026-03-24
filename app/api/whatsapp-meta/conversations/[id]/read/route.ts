// app/api/whatsapp-meta/conversations/[id]/read/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const { error } = await supabaseAdmin
      .from('meta_conversations')
      .update({ unread_count: 0 })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao marcar conversa como lida' },
      { status: 500 }
    )
  }
}