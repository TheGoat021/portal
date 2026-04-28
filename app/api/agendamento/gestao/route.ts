import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ensureProfileEmailExists,
  insertOperationalHistory,
  normalizeEmail,
  normalizeOperationalPayload,
  resolveProfileIdByEmail,
  STATUS_BY_TYPE,
} from "@/lib/agendamentoOperational";

function isMissingPaymentDueTimeColumn(message?: string) {
  return String(message || "").includes("payment_due_time");
}

function isTypeStatusConstraintViolation(message?: string) {
  return String(message || "").includes("chk_agendamento_operational_type_status");
}

function nextDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const recordType = params.get("record_type")?.trim() || "";
    const status = params.get("status")?.trim() || "";
    const attendantEmail = normalizeEmail(params.get("attendant_email"));
    const commercialOwnerEmail = normalizeEmail(params.get("commercial_owner_email"));
    const clinicName = params.get("clinic_name")?.trim() || "";
    const patientCity = params.get("patient_city")?.trim() || "";
    const planName = params.get("plan_name")?.trim() || "";
    const appointmentDate = params.get("appointment_date")?.trim() || "";
    const consultationDate = params.get("consultation_date")?.trim() || "";
    const createdDate = params.get("created_date")?.trim() || "";
    const paymentStatus = params.get("payment_status")?.trim() || "";
    const needsPayment = params.get("needs_payment")?.trim() || "";
    const search = params.get("search")?.trim() || "";
    const limit = Math.min(Math.max(Number.parseInt(params.get("limit") || "50", 10) || 50, 1), 200);
    const offset = Math.max(Number.parseInt(params.get("offset") || "0", 10) || 0, 0);

    let query = supabaseAdmin
      .from("agendamento_operational_records")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (recordType) query = query.eq("record_type", recordType);
    if (status) query = query.eq("status", status);
    if (attendantEmail) query = query.ilike("attendant_email", attendantEmail);
    if (commercialOwnerEmail) query = query.ilike("commercial_owner_email", commercialOwnerEmail);
    if (clinicName) query = query.ilike("clinic_name", clinicName);
    if (patientCity) query = query.ilike("patient_city", patientCity);
    if (planName) query = query.ilike("plan_name", planName);
    if (appointmentDate) query = query.eq("appointment_date", appointmentDate);
    if (consultationDate) query = query.eq("payment_due_date", consultationDate);
    if (createdDate) {
      query = query.gte("created_at", `${createdDate}T00:00:00-03:00`).lt("created_at", `${nextDate(createdDate)}T00:00:00-03:00`);
    }
    if (paymentStatus) query = query.eq("payment_status", paymentStatus);
    if (needsPayment) query = query.eq("needs_payment", needsPayment === "true");
    if (search) {
      const escaped = search.replace(/[%(),]/g, " ");
      query = query.or(
        `patient_name.ilike.%${escaped}%,contract_id.ilike.%${escaped}%,patient_phone.ilike.%${escaped}%,patient_email.ilike.%${escaped}%,observation.ilike.%${escaped}%`
      );
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      filters: {
        statuses: STATUS_BY_TYPE,
      },
      pagination: {
        total: Number(count ?? 0),
        limit,
        offset,
        hasMore: offset + (data?.length ?? 0) < Number(count ?? 0),
      },
    });
  } catch (error) {
    console.error("Erro ao listar registros operacionais:", error);
    return NextResponse.json({ error: "Erro interno ao listar registros" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const normalized = normalizeOperationalPayload(body, "create");
    if (normalized.error || !normalized.data) {
      return NextResponse.json({ error: normalized.error || "Payload invalido" }, { status: 400 });
    }

    const payload = normalized.data;

    const attendantExists = await ensureProfileEmailExists(payload.attendant_email);
    if (!attendantExists) {
      return NextResponse.json({ error: "attendant_email nao encontrado em profiles" }, { status: 400 });
    }

    if (payload.commercial_owner_email) {
      const commercialExists = await ensureProfileEmailExists(payload.commercial_owner_email);
      if (!commercialExists) {
        return NextResponse.json({ error: "commercial_owner_email nao encontrado em profiles" }, { status: 400 });
      }
    }

    const actorUserId = await resolveProfileIdByEmail(payload.actor_user_email);

    const insertPayload = {
      patient_name: payload.patient_name,
      patient_phone: payload.patient_phone,
      patient_cpf: payload.patient_cpf,
      patient_birth_date: payload.patient_birth_date,
      patient_email: payload.patient_email,
      patient_city: payload.patient_city,
      contract_id: payload.contract_id,
      plan_name: payload.plan_name,
      record_type: payload.record_type,
      status: payload.status,
      appointment_date: payload.appointment_date,
      appointment_time: payload.appointment_time,
      clinic_name: payload.clinic_name,
      specialty_name: payload.specialty_name,
      attendant_email: payload.attendant_email,
      commercial_owner_email: payload.commercial_owner_email,
      needs_payment: payload.needs_payment,
      payment_status: payload.payment_status,
      payment_amount: payload.payment_amount,
      payment_due_date: payload.payment_due_date,
      payment_due_time: payload.payment_due_time,
      call_status: payload.call_status,
      cancellation_reason: payload.cancellation_reason,
      observation: payload.observation,
      source_lead_id: payload.source_lead_id,
      source_client_id: payload.source_client_id,
      source_conversation_id: payload.source_conversation_id,
      source_meta_conversation_id: payload.source_meta_conversation_id,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };

    let { data, error } = await supabaseAdmin
      .from("agendamento_operational_records")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error && isMissingPaymentDueTimeColumn(error.message)) {
      const { payment_due_time, ...fallbackPayload } = insertPayload;
      void payment_due_time;
      const retry = await supabaseAdmin
        .from("agendamento_operational_records")
        .insert(fallbackPayload)
        .select("*")
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      if (isTypeStatusConstraintViolation(error?.message)) {
        return NextResponse.json(
          { error: "Os status configurados na aplicacao nao batem com a regra atual do banco. Atualize a constraint chk_agendamento_operational_type_status." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error?.message || "Erro ao criar registro" }, { status: 500 });
    }

    await insertOperationalHistory({
      recordId: String(data.id),
      action: "created",
      newValue: JSON.stringify(data),
      actorUserId,
      actorUserEmail: payload.actor_user_email,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar registro operacional:", error);
    return NextResponse.json({ error: "Erro interno ao criar registro" }, { status: 500 });
  }
}
