import { env } from "../env.js"
import { supabaseAdmin } from "../supabase.js"
import { buildPhoneVariants, normalizePhone } from "../utils/phone.js"
import { logger } from "../utils/logger.js"

type ClienteRow = {
  id: string
  nome: string | null
  telefone: string | null
  email: string | null
}

type LeadRow = {
  id: string
  cliente_id: string
}

export type CrmAssociationResult = {
  normalizedPhone: string
  clienteId: string | null
  leadId: string | null
  matchType: "cliente" | "lead" | "pending_lead"
}

async function findClienteByPhone(phone: string) {
  const variants = buildPhoneVariants(phone)
  if (variants.length === 0) return null

  const orClause = variants.map((item) => `telefone.eq.${item}`).join(",")
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, telefone, email")
    .or(orClause)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to query clientes: ${error.message}`)
  }

  return (data as ClienteRow | null) ?? null
}

async function findLeadByClienteId(clienteId: string) {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id, cliente_id")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to query leads: ${error.message}`)
  }

  return (data as LeadRow | null) ?? null
}

async function createLeadPlaceholder(clienteId: string) {
  if (!env.voiceDefaultOrigemId) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert({
      cliente_id: clienteId,
      origem_id: env.voiceDefaultOrigemId,
      status: "novo",
      plataforma: "voice"
    })
    .select("id, cliente_id")
    .single()

  if (error) {
    logger.warn("Failed to create voice lead placeholder", {
      clienteId,
      error: error.message
    })
    return null
  }

  return data as LeadRow
}

export async function resolveCrmAssociationByPhone(
  phone?: string | null
): Promise<CrmAssociationResult> {
  const normalizedPhone = normalizePhone(phone)

  if (!normalizedPhone) {
    return {
      normalizedPhone: "",
      clienteId: null,
      leadId: null,
      matchType: "pending_lead"
    }
  }

  const cliente = await findClienteByPhone(normalizedPhone)

  if (!cliente?.id) {
    return {
      normalizedPhone,
      clienteId: null,
      leadId: null,
      matchType: "pending_lead"
    }
  }

  const existingLead = await findLeadByClienteId(cliente.id)

  if (existingLead?.id) {
    return {
      normalizedPhone,
      clienteId: cliente.id,
      leadId: existingLead.id,
      matchType: "lead"
    }
  }

  const placeholder = await createLeadPlaceholder(cliente.id)

  return {
    normalizedPhone,
    clienteId: cliente.id,
    leadId: placeholder?.id ?? null,
    matchType: placeholder?.id ? "lead" : "cliente"
  }
}
