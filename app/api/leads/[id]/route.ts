import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const { status } = await req.json()

  if (!id) {
    return NextResponse.json(
      { error: 'ID do lead não informado' },
      { status: 400 }
    )
  }

  if (!status) {
    return NextResponse.json(
      { error: 'Status é obrigatório' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('leads')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
