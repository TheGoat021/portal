import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

function normalizePhone(phone?: string | null) {
  if (!phone) return ""
  return String(phone).replace(/\D/g, "")
}

function buildPhoneVariants(phone: string) {
  const normalized = normalizePhone(phone)
  if (!normalized) return []

  const variants = new Set<string>()
  variants.add(normalized)

  if (normalized.startsWith("55")) {
    const without55 = normalized.slice(2)
    variants.add(without55)

    if (without55.length >= 11) {
      const ddd = without55.slice(0, 2)
      const number = without55.slice(2)
      if (number.length === 9 && number.startsWith("9")) {
        const withoutNine = ddd + number.slice(1)
        variants.add(withoutNine)
        variants.add(`55${withoutNine}`)
      }
    }
  } else {
    variants.add(`55${normalized}`)
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

function toMs(value?: string | null) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function resolveLegacyAgentByPhone(phone: string) {
  const normalized = normalizePhone(phone)
  const variants = buildPhoneVariants(normalized)
  if (!variants.length) return { agent: null as string | null, conversationId: null as string | null, ts: 0 }

  const orConditions = variants
    .flatMap((value) => [value, `+${value}`, `${value}@c.us`, `${value}@s.whatsapp.net`])
    .map((value) => `phone.eq.${value}`)
    .join(",")

  if (!orConditions) return { agent: null as string | null, conversationId: null as string | null, ts: 0 }

  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("id, phone, agent_name, last_message_at, created_at")
    .or(orConditions)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(20)

  if (error || !data?.length) {
    return { agent: null as string | null, conversationId: null as string | null, ts: 0 }
  }

  const best =
    [...data].sort(
      (a, b) => scorePhoneMatch(normalized, b.phone) - scorePhoneMatch(normalized, a.phone)
    )[0] ?? null

  if (!best) return { agent: null as string | null, conversationId: null as string | null, ts: 0 }

  return {
    agent: best.agent_name || null,
    conversationId: String(best.id),
    ts: toMs(best.last_message_at) || toMs(best.created_at)
  }
}

async function resolveMetaAgentByPhone(phone: string) {
  const normalized = normalizePhone(phone)
  const variants = buildPhoneVariants(normalized)
  if (!variants.length) return { agent: null as string | null, conversationId: null as string | null, ts: 0 }

  const { data: conversations, error: convError } = await supabaseAdmin
    .from("meta_conversations")
    .select("id, wa_id, last_message_at, created_at")
    .in("wa_id", variants)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(20)

  if (convError || !conversations?.length) {
    return { agent: null as string | null, conversationId: null as string | null, ts: 0 }
  }

  const bestConversation =
    [...conversations].sort(
      (a, b) => scorePhoneMatch(normalized, b.wa_id) - scorePhoneMatch(normalized, a.wa_id)
    )[0] ?? null

  if (!bestConversation) return { agent: null as string | null, conversationId: null as string | null, ts: 0 }

  const conversationId = String(bestConversation.id)
  const { data: management, error: managementError } = await supabaseAdmin
    .from("meta_conversation_management")
    .select("conversation_id, status, assigned_user_email, updated_at")
    .eq("conversation_id", conversationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (managementError) {
    return {
      agent: null,
      conversationId,
      ts: toMs(bestConversation.last_message_at) || toMs(bestConversation.created_at)
    }
  }

  return {
    agent: management?.assigned_user_email || null,
    conversationId,
    ts: toMs(management?.updated_at) || toMs(bestConversation.last_message_at) || toMs(bestConversation.created_at)
  }
}

async function resolveAgentByPhone(phone: string) {
  const [legacy, meta] = await Promise.all([resolveLegacyAgentByPhone(phone), resolveMetaAgentByPhone(phone)])

  if (meta.agent && meta.ts >= legacy.ts) {
    return { conversationId: meta.conversationId, agent_name: meta.agent }
  }
  if (legacy.agent) {
    return { conversationId: legacy.conversationId, agent_name: legacy.agent }
  }
  if (meta.agent) {
    return { conversationId: meta.conversationId, agent_name: meta.agent }
  }

  return { conversationId: legacy.conversationId || meta.conversationId || null, agent_name: null }
}

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone")
    const phonesRaw = req.nextUrl.searchParams.get("phones")

    if (phonesRaw) {
      const phoneList = Array.from(
        new Set(
          String(phonesRaw)
            .split(",")
            .map((item) => normalizePhone(item))
            .filter(Boolean)
        )
      ).slice(0, 200)

      const results = await Promise.all(
        phoneList.map(async (item) => {
          const resolved = await resolveAgentByPhone(item)
          return [item, resolved.agent_name] as const
        })
      )

      const agents = Object.fromEntries(results)
      return NextResponse.json({ agents })
    }

    if (!phone) {
      return NextResponse.json({ error: "phone é obrigatório" }, { status: 400 })
    }

    const normalized = normalizePhone(phone)
    if (!normalized) {
      return NextResponse.json({ error: "phone inválido" }, { status: 400 })
    }

    const resolved = await resolveAgentByPhone(normalized)
    return NextResponse.json({
      conversationId: resolved.conversationId,
      agent_name: resolved.agent_name
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
