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
      const number = without55.slice(2)

      if (number.length === 9 && number.startsWith('9')) {
        const withoutNine = ddd + number.slice(1)

        variants.add(withoutNine)
        variants.add(`+${withoutNine}`)
        variants.add(`${withoutNine}@c.us`)
        variants.add(`${withoutNine}@s.whatsapp.net`)

        variants.add(`55${withoutNine}`)
        variants.add(`+55${withoutNine}`)
        variants.add(`55${withoutNine}@c.us`)
        variants.add(`55${withoutNine}@s.whatsapp.net`)
      }
    }
  }

  return Array.from(variants)
}

function scorePhoneMatch(target: string, candidate?: string | null) {
  const a = normalizePhone(target)
  const b = normalizePhone(candidate)

  if (!a || !b) return 0
  if (a === b) return 100
  if (b.endsWith(a)) return 90
  if (a.endsWith(b)) return 80

  if (a.slice(-10) === b.slice(-10)) return 70
  if (a.slice(-8) === b.slice(-8)) return 50

  return 0
}

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { error: 'phone é obrigatório' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhone(phone)

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'phone inválido' },
        { status: 400 }
      )
    }

    const phoneVariants = buildPhoneVariants(normalizedPhone)
    const orConditions = phoneVariants.map((p) => `phone.eq.${p}`).join(',')

    let conversation: any = null

    if (orConditions) {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('id, phone, name, agent_name, last_message_at, created_at')
        .or(orConditions)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(20)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      if (data?.length) {
        conversation =
          [...data].sort(
            (a, b) =>
              scorePhoneMatch(normalizedPhone, b.phone) -
              scorePhoneMatch(normalizedPhone, a.phone)
          )[0] || null
      }
    }

    if (!conversation) {
      return NextResponse.json({
        conversationId: null,
        agent_name: null
      })
    }

    return NextResponse.json({
      conversationId: conversation.id,
      agent_name: conversation.agent_name || null
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}