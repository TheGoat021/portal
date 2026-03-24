// app/api/whatsapp-meta/conversations/[id]/messages/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'conversationId é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('meta_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      data: data ?? []
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao listar mensagens' },
      { status: 500 }
    )
  }
}