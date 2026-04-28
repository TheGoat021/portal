import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const RECORD_TYPES = [
  "agendamento",
  "ficticio",
  "cancelamento",
  "comercial_ligacoes",
  "exames_ligacoes",
] as const;

export const PAYMENT_STATUSES = ["nao_aplica", "a_pagar", "pago"] as const;
export const CALL_STATUSES = ["venda_feita", "venda_nao_realizada"] as const;

export const STATUS_BY_TYPE = {
  agendamento: [
    "Verificando agendamento",
    "Aguardando pagamento",
    "Agendado, falta enviar voucher",
    "Voucher enviado",
    "Aguardando agenda abrir",
  ],
  ficticio: [
    "Verificando agendamento",
    "Reagendado, falta enviar o voucher",
    "Cliente avisado",
    "Voucher enviado",
    "Aguardando agenda abrir",
  ],
  cancelamento: ["Revertido", "Nao revertido", "Em tratativa"],
  comercial_ligacoes: ["Venda feita", "Venda nao realizada"],
  exames_ligacoes: ["Venda feita", "Venda nao realizada"],
} as const;

export type RecordType = (typeof RECORD_TYPES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type CallStatus = (typeof CALL_STATUSES)[number];

export type OperationalRecordPayload = {
  patient_name?: unknown;
  patient_phone?: unknown;
  patient_cpf?: unknown;
  patient_birth_date?: unknown;
  patient_email?: unknown;
  patient_city?: unknown;
  contract_id?: unknown;
  plan_name?: unknown;
  record_type?: unknown;
  status?: unknown;
  appointment_date?: unknown;
  appointment_time?: unknown;
  clinic_name?: unknown;
  specialty_name?: unknown;
  attendant_email?: unknown;
  commercial_owner_email?: unknown;
  needs_payment?: unknown;
  payment_status?: unknown;
  payment_amount?: unknown;
  payment_due_date?: unknown;
  payment_due_time?: unknown;
  call_status?: unknown;
  cancellation_reason?: unknown;
  observation?: unknown;
  source_lead_id?: unknown;
  source_client_id?: unknown;
  source_conversation_id?: unknown;
  source_meta_conversation_id?: unknown;
  actor_user_email?: unknown;
};

export type NormalizedOperationalRecord = {
  patient_name: string;
  patient_phone: string;
  patient_cpf: string | null;
  patient_birth_date: string | null;
  patient_email: string | null;
  patient_city: string | null;
  contract_id: string | null;
  plan_name: string;
  record_type: RecordType;
  status: string;
  appointment_date: string | null;
  appointment_time: string | null;
  clinic_name: string | null;
  specialty_name: string | null;
  attendant_email: string;
  commercial_owner_email: string | null;
  needs_payment: boolean;
  payment_status: PaymentStatus;
  payment_amount: number | null;
  payment_due_date: string | null;
  payment_due_time: string | null;
  call_status: CallStatus | null;
  cancellation_reason: string | null;
  observation: string;
  source_lead_id: string | null;
  source_client_id: string | null;
  source_conversation_id: string | null;
  source_meta_conversation_id: string | null;
  actor_user_email: string | null;
};

export function asTrimmedString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function asNullableString(value: unknown) {
  const trimmed = asTrimmedString(value);
  return trimmed ? trimmed : null;
}

export function normalizeEmail(value: unknown) {
  const trimmed = asTrimmedString(value).toLowerCase();
  return trimmed || null;
}

function isValidRecordType(value: string): value is RecordType {
  return (RECORD_TYPES as readonly string[]).includes(value);
}

function isValidPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

function isValidCallStatus(value: string): value is CallStatus {
  return (CALL_STATUSES as readonly string[]).includes(value);
}

function parseCurrencyInput(value: unknown) {
  const raw = asTrimmedString(value);
  if (!raw) return { raw: "", value: null as number | null };

  const sanitized = raw.replace(/[^\d,.-]/g, "").trim();
  if (!sanitized) return { raw, value: null as number | null };

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");

  let normalized = sanitized;

  if (lastComma > lastDot) {
    normalized = sanitized.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = sanitized.replace(/,/g, "");
  } else {
    normalized = sanitized.replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized);
  return { raw, value: Number.isFinite(parsed) ? parsed : Number.NaN };
}

export function normalizeOperationalPayload(
  payload: OperationalRecordPayload,
  mode: "create" | "update" = "create"
): { data?: NormalizedOperationalRecord; error?: string } {
  const patient_name = asTrimmedString(payload.patient_name);
  const patient_phone = asTrimmedString(payload.patient_phone);
  const plan_name = asTrimmedString(payload.plan_name);
  const record_type_raw = asTrimmedString(payload.record_type);
  const status = asTrimmedString(payload.status);
  const attendant_email = normalizeEmail(payload.attendant_email);
  const commercial_owner_email = normalizeEmail(payload.commercial_owner_email);
  const actor_user_email = normalizeEmail(payload.actor_user_email);

  if (mode === "create") {
    if (!patient_name) return { error: "patient_name e obrigatorio" };
    if (!patient_phone) return { error: "patient_phone e obrigatorio" };
    if (!plan_name) return { error: "plan_name e obrigatorio" };
    if (!record_type_raw) return { error: "record_type e obrigatorio" };
    if (!status) return { error: "status e obrigatorio" };
    if (!attendant_email) return { error: "attendant_email e obrigatorio" };
  }

  if (!isValidRecordType(record_type_raw)) {
    return { error: "record_type invalido" };
  }

  if (!(STATUS_BY_TYPE[record_type_raw] as readonly string[]).includes(status)) {
    return { error: "status invalido para o record_type informado" };
  }

  const needs_payment = Boolean(payload.needs_payment);
  const payment_status_raw = asTrimmedString(payload.payment_status) || (needs_payment ? "a_pagar" : "nao_aplica");

  if (!isValidPaymentStatus(payment_status_raw)) {
    return { error: "payment_status invalido" };
  }

  const call_status_input = asTrimmedString(payload.call_status);
  if (call_status_input && !isValidCallStatus(call_status_input)) {
    return { error: "call_status invalido" };
  }
  let call_status_raw: CallStatus | null = null;
  if (call_status_input) {
    call_status_raw = call_status_input as CallStatus;
  }

  const { raw: payment_amount_raw, value: payment_amount } = parseCurrencyInput(payload.payment_amount);

  if (payment_amount_raw && (!Number.isFinite(payment_amount) || Number(payment_amount) < 0)) {
    return { error: "payment_amount invalido" };
  }

  return {
    data: {
      patient_name,
      patient_phone,
      patient_cpf: asNullableString(payload.patient_cpf),
      patient_birth_date: asNullableString(payload.patient_birth_date),
      patient_email: normalizeEmail(payload.patient_email),
      patient_city: asNullableString(payload.patient_city),
      contract_id: asNullableString(payload.contract_id),
      plan_name,
      record_type: record_type_raw,
      status,
      appointment_date: asNullableString(payload.appointment_date),
      appointment_time: asNullableString(payload.appointment_time),
      clinic_name: asNullableString(payload.clinic_name),
      specialty_name: asNullableString(payload.specialty_name),
      attendant_email: attendant_email || "",
      commercial_owner_email,
      needs_payment,
      payment_status: payment_status_raw,
      payment_amount: payment_amount === null ? null : Number(payment_amount),
      payment_due_date: asNullableString(payload.payment_due_date),
      payment_due_time: asNullableString(payload.payment_due_time),
      call_status: call_status_raw,
      cancellation_reason: asNullableString(payload.cancellation_reason),
      observation: asTrimmedString(payload.observation),
      source_lead_id: asNullableString(payload.source_lead_id),
      source_client_id: asNullableString(payload.source_client_id),
      source_conversation_id: asNullableString(payload.source_conversation_id),
      source_meta_conversation_id: asNullableString(payload.source_meta_conversation_id),
      actor_user_email,
    },
  };
}

export async function resolveProfileIdByEmail(email?: string | null) {
  if (!email) return null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.id ? String(data.id) : null;
}

export async function ensureProfileEmailExists(email?: string | null) {
  if (!email) return false;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  return !error && Boolean(data?.id);
}

export async function insertOperationalHistory(input: {
  recordId: string;
  action: "created" | "updated" | "status_changed" | "deleted";
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  actorUserId?: string | null;
  actorUserEmail?: string | null;
}) {
  const { error } = await supabaseAdmin.from("agendamento_operational_history").insert({
    record_id: input.recordId,
    action: input.action,
    field_name: input.fieldName ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    actor_user_id: input.actorUserId ?? null,
    actor_user_email: input.actorUserEmail ?? null,
  });

  return error;
}
