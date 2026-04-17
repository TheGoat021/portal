import { supabaseAdmin } from "@/lib/supabaseAdmin"

type LegacyConversationRow = {
  id: string
  phone: string | null
  name: string | null
  email: string | null
}

type MetaConversationRow = {
  id: string
  wa_id: string | null
  contact_name: string | null
  profile_name: string | null
}

type ClienteRow = {
  id: string
  nome: string | null
  telefone: string | null
  email: string | null
}

export function normalizePhone(phone?: string | null) {
  if (!phone) return ""
  return String(phone).replace(/\D/g, "")
}

function buildPhoneVariants(phone?: string | null) {
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

async function findWhatsAppOrigemIds() {
  const { data, error } = await supabaseAdmin
    .from("origens")
    .select("id, nome, plataforma")
    .or("nome.ilike.%whatsapp%,plataforma.ilike.%whatsapp%,nome.ilike.%meta%")

  if (error) throw new Error(error.message)

  const rows = data ?? []
  if (rows.length === 0) {
    throw new Error('Origem WhatsApp não encontrada. Crie uma origem com "WhatsApp".')
  }

  const legacy =
    rows.find((row) => /whatsapp/i.test(String(row.nome || "")) && !/meta/i.test(String(row.nome || ""))) ??
    rows.find((row) => /whatsapp/i.test(String(row.plataforma || ""))) ??
    rows[0]

  const meta =
    rows.find((row) => /meta/i.test(String(row.nome || "")) && /whatsapp/i.test(String(row.nome || ""))) ??
    rows.find((row) => /meta/i.test(String(row.plataforma || ""))) ??
    legacy

  return {
    legacyOrigemId: String(legacy.id),
    metaOrigemId: String(meta.id)
  }
}

async function leadExistsByConversationId(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("conversation_id", conversationId)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return Boolean(data?.id)
}

async function findClienteByPhone(phone: string) {
  const variants = buildPhoneVariants(phone)
  if (variants.length === 0) return null

  const orClause = variants.map((value) => `telefone.eq.${value}`).join(",")
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, telefone, email")
    .or(orClause)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as ClienteRow | null) ?? null
}

async function upsertClienteFromConversation({
  phone,
  name,
  email
}: {
  phone: string
  name?: string | null
  email?: string | null
}) {
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) return null

  let cliente = await findClienteByPhone(normalizedPhone)
  if (!cliente) {
    const { data: created, error: createError } = await supabaseAdmin
      .from("clientes")
      .insert({
        nome: name?.trim() || "Sem nome",
        telefone: normalizedPhone,
        email: email?.trim() || null
      })
      .select("id, nome, telefone, email")
      .single()

    if (createError) throw new Error(createError.message)
    return created as ClienteRow
  }

  const shouldUpdateNome = (!cliente.nome || cliente.nome === "Sem nome") && Boolean(name?.trim())
  const shouldUpdateEmail = !cliente.email && Boolean(email?.trim())

  if (shouldUpdateNome || shouldUpdateEmail) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("clientes")
      .update({
        ...(shouldUpdateNome ? { nome: name?.trim() || null } : {}),
        ...(shouldUpdateEmail ? { email: email?.trim() || null } : {})
      })
      .eq("id", cliente.id)
      .select("id, nome, telefone, email")
      .single()

    if (updateError) throw new Error(updateError.message)
    cliente = updated as ClienteRow
  }

  return cliente
}

async function createLead({
  clienteId,
  origemId,
  conversationId,
  plataforma
}: {
  clienteId: string
  origemId: string
  conversationId: string
  plataforma: "whatsapp" | "meta"
}) {
  const { error } = await supabaseAdmin.from("leads").insert({
    cliente_id: clienteId,
    origem_id: origemId,
    conversation_id: conversationId,
    status: "novo",
    plataforma
  })

  if (error) throw new Error(error.message)
}

export async function syncLeadFromLegacyConversation(conversation: LegacyConversationRow, origemId: string) {
  const conversationId = String(conversation.id)
  if (!conversationId) return { created: false, skipped: true }

  if (await leadExistsByConversationId(conversationId)) {
    return { created: false, skipped: true }
  }

  const normalizedPhone = normalizePhone(conversation.phone)
  if (!normalizedPhone) {
    return { created: false, skipped: true }
  }

  const cliente = await upsertClienteFromConversation({
    phone: normalizedPhone,
    name: conversation.name,
    email: conversation.email
  })

  if (!cliente?.id) {
    return { created: false, skipped: true }
  }

  await createLead({
    clienteId: String(cliente.id),
    origemId,
    conversationId,
    plataforma: "whatsapp"
  })

  return { created: true, skipped: false }
}

export async function syncLeadFromMetaConversation(conversation: MetaConversationRow, origemId: string) {
  const conversationId = String(conversation.id)
  if (!conversationId) return { created: false, skipped: true }

  if (await leadExistsByConversationId(conversationId)) {
    return { created: false, skipped: true }
  }

  const normalizedPhone = normalizePhone(conversation.wa_id)
  if (!normalizedPhone) {
    return { created: false, skipped: true }
  }

  const cliente = await upsertClienteFromConversation({
    phone: normalizedPhone,
    name: conversation.contact_name || conversation.profile_name || "Sem nome",
    email: null
  })

  if (!cliente?.id) {
    return { created: false, skipped: true }
  }

  await createLead({
    clienteId: String(cliente.id),
    origemId,
    conversationId,
    plataforma: "meta"
  })

  return { created: true, skipped: false }
}

export async function syncLeadFromMetaConversationId(conversationId: string) {
  const { metaOrigemId } = await findWhatsAppOrigemIds()

  const { data, error } = await supabaseAdmin
    .from("meta_conversations")
    .select("id, wa_id, contact_name, profile_name")
    .eq("id", conversationId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return { created: false, skipped: true }

  return syncLeadFromMetaConversation(data as MetaConversationRow, metaOrigemId)
}

export async function syncAllWhatsAppLeads(options?: { includeLegacy?: boolean; includeMeta?: boolean }) {
  const includeLegacy = options?.includeLegacy ?? true
  const includeMeta = options?.includeMeta ?? true

  const { legacyOrigemId, metaOrigemId } = await findWhatsAppOrigemIds()

  let created = 0
  let skipped = 0
  const errors: Array<{ source: "legacy" | "meta"; conversationId: string; error: string }> = []

  if (includeLegacy) {
    const { data: legacyConversations, error } = await supabaseAdmin
      .from("conversations")
      .select("id, phone, name, email")
      .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)

    for (const row of (legacyConversations ?? []) as LegacyConversationRow[]) {
      try {
        const result = await syncLeadFromLegacyConversation(row, legacyOrigemId)
        if (result.created) created += 1
        else skipped += 1
      } catch (syncError) {
        errors.push({
          source: "legacy",
          conversationId: String(row.id),
          error: syncError instanceof Error ? syncError.message : String(syncError)
        })
      }
    }
  }

  if (includeMeta) {
    const { data: metaConversations, error } = await supabaseAdmin
      .from("meta_conversations")
      .select("id, wa_id, contact_name, profile_name")
      .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)

    for (const row of (metaConversations ?? []) as MetaConversationRow[]) {
      try {
        const result = await syncLeadFromMetaConversation(row, metaOrigemId)
        if (result.created) created += 1
        else skipped += 1
      } catch (syncError) {
        errors.push({
          source: "meta",
          conversationId: String(row.id),
          error: syncError instanceof Error ? syncError.message : String(syncError)
        })
      }
    }
  }

  return { created, skipped, errors }
}
