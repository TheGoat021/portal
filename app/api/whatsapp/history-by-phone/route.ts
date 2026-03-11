import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function normalizePhone(phone?: string | null) {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

function buildPhoneVariants(phone: string) {
  const normalized = normalizePhone(phone)
  if (!normalized) return []

  const variants = new Set<string>()

  variants.add(normalized)
  variants.add(`+${normalized}`)
  variants.add(`${normalized}@c.us`)
  variants.add(`${normalized}@s.whatsapp.net`)

  if (normalized.startsWith('55')) {
    const without55 = normalized.slice(2)

    variants.add(without55)
    variants.add(`+${without55}`)
    variants.add(`${without55}@c.us`)
    variants.add(`${without55}@s.whatsapp.net`)

    if (without55.length >= 11) {
      const ddd = without55.slice(0, 2)
      const numero = without55.slice(2)

      if (numero.length === 9 && numero.startsWith('9')) {
        const semNove = ddd + numero.slice(1)

        variants.add(semNove)
        variants.add(`+${semNove}`)
        variants.add(`${semNove}@c.us`)
        variants.add(`${semNove}@s.whatsapp.net`)

        variants.add(`55${semNove}`)
        variants.add(`+55${semNove}`)
        variants.add(`55${semNove}@c.us`)
        variants.add(`55${semNove}@s.whatsapp.net`)
      }
    }
  }

  return Array.from(variants)
}

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone')

    if (!phone) {
      return NextResponse.json({ error: 'phone é obrigatório' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    const phoneVariants = buildPhoneVariants(normalizedPhone)

    console.log('📞 phone recebido:', phone)
    console.log('📞 normalizedPhone:', normalizedPhone)
    console.log('📞 phoneVariants:', phoneVariants)

    const orConditions = phoneVariants.map((p) => `phone.eq.${p}`).join(',')

    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select('id, phone, name, email, last_message_at, created_at')
      .or(orConditions)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (conversationsError) {
      console.error('❌ erro conversations:', conversationsError)
      return NextResponse.json({ error: conversationsError.message }, { status: 500 })
    }

    console.log('📦 conversations encontradas:', conversations)

    const conversation = conversations?.[0]

    if (!conversation) {
      // diagnóstico extra: pega algumas conversas recentes pra você ver como o telefone está salvo
      const { data: recent } = await supabaseAdmin
        .from('conversations')
        .select('id, phone, name, last_message_at')
        .not('phone', 'is', null)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(20)

      console.log('🧪 últimas conversations para comparar:', recent)

      return NextResponse.json({
        conversationId: null,
        conversation: null,
        messages: [],
        debug: {
          phone,
          normalizedPhone,
          phoneVariants,
          recentPhones: recent?.map((item) => item.phone) || []
        }
      })
    }

    console.log('✅ conversation encontrada:', conversation)

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        conversation_id,
        message,
        direction,
        created_at,
        type,
        media_url,
        agent_name
      `)
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('❌ erro messages:', messagesError)
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    console.log('💬 messages encontradas:', messages?.length || 0)

    return NextResponse.json({
      conversationId: conversation.id,
      conversation,
      messages: messages || []
    })
  } catch (error: any) {
    console.error('❌ erro geral history-by-phone:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}