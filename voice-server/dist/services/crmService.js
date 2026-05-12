import { env } from "../env.js";
import { supabaseAdmin } from "../supabase.js";
import { buildPhoneVariants, normalizePhone } from "../utils/phone.js";
import { logger } from "../utils/logger.js";
async function findClienteByPhone(phone) {
    const variants = buildPhoneVariants(phone);
    if (variants.length === 0)
        return null;
    const orClause = variants.map((item) => `telefone.eq.${item}`).join(",");
    const { data, error } = await supabaseAdmin
        .from("clientes")
        .select("id, nome, telefone, email")
        .or(orClause)
        .limit(1)
        .maybeSingle();
    if (error) {
        throw new Error(`Failed to query clientes: ${error.message}`);
    }
    return data ?? null;
}
async function findLeadByClienteId(clienteId) {
    const { data, error } = await supabaseAdmin
        .from("leads")
        .select("id, cliente_id")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) {
        throw new Error(`Failed to query leads: ${error.message}`);
    }
    return data ?? null;
}
async function createLeadPlaceholder(clienteId) {
    if (!env.voiceDefaultOrigemId) {
        return null;
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
        .single();
    if (error) {
        logger.warn("Failed to create voice lead placeholder", {
            clienteId,
            error: error.message
        });
        return null;
    }
    return data;
}
export async function resolveCrmAssociationByPhone(phone) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
        return {
            normalizedPhone: "",
            clienteId: null,
            leadId: null,
            matchType: "pending_lead"
        };
    }
    const cliente = await findClienteByPhone(normalizedPhone);
    if (!cliente?.id) {
        return {
            normalizedPhone,
            clienteId: null,
            leadId: null,
            matchType: "pending_lead"
        };
    }
    const existingLead = await findLeadByClienteId(cliente.id);
    if (existingLead?.id) {
        return {
            normalizedPhone,
            clienteId: cliente.id,
            leadId: existingLead.id,
            matchType: "lead"
        };
    }
    const placeholder = await createLeadPlaceholder(cliente.id);
    return {
        normalizedPhone,
        clienteId: cliente.id,
        leadId: placeholder?.id ?? null,
        matchType: placeholder?.id ? "lead" : "cliente"
    };
}
