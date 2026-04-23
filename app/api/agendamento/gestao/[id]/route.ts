import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ensureProfileEmailExists,
  insertOperationalHistory,
  normalizeOperationalPayload,
  resolveProfileIdByEmail,
} from "@/lib/agendamentoOperational";

function isMissingPaymentDueTimeColumn(message?: string) {
  return String(message || "").includes("payment_due_time");
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getExistingRecord(id: string) {
  const { data, error } = await supabaseAdmin
    .from("agendamento_operational_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data, error: null };
}

export async function GET(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { data, error } = await getExistingRecord(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });
  }

  const { data: history, error: historyError } = await supabaseAdmin
    .from("agendamento_operational_history")
    .select("*")
    .eq("record_id", id)
    .order("created_at", { ascending: false });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  return NextResponse.json({ record: data, history: history ?? [] });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { data: existing, error: existingError } = await getExistingRecord(id);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const merged = { ...existing, ...body };
    const normalized = normalizeOperationalPayload(merged, "update");
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

    const updatePayload = {
      patient_name: payload.patient_name,
      patient_phone: payload.patient_phone,
      patient_cpf: payload.patient_cpf,
      patient_email: payload.patient_email,
      patient_city: payload.patient_city,
      plan_name: payload.plan_name,
      record_type: payload.record_type,
      status: payload.status,
      appointment_date: payload.appointment_date,
      appointment_time: payload.appointment_time,
      clinic_name: payload.clinic_name,
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
      updated_by_user_id: actorUserId,
    };

    let { data, error } = await supabaseAdmin
      .from("agendamento_operational_records")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error && isMissingPaymentDueTimeColumn(error.message)) {
      const { payment_due_time, ...fallbackPayload } = updatePayload;
      void payment_due_time;
      const retry = await supabaseAdmin
        .from("agendamento_operational_records")
        .update(fallbackPayload)
        .eq("id", id)
        .select("*")
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Erro ao atualizar registro" }, { status: 500 });
    }

    const changedFields = Object.entries(updatePayload).filter(([key, value]) => {
      const currentValue = existing[key as keyof typeof existing] ?? null;
      return String(currentValue ?? "") !== String(value ?? "");
    });

    for (const [fieldName, newValue] of changedFields) {
      await insertOperationalHistory({
        recordId: id,
        action: fieldName === "status" ? "status_changed" : "updated",
        fieldName,
        oldValue: existing[fieldName as keyof typeof existing] === null ? null : String(existing[fieldName as keyof typeof existing]),
        newValue: newValue === null ? null : String(newValue),
        actorUserId,
        actorUserEmail: payload.actor_user_email,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao atualizar registro operacional:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar registro" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { data: existing, error: existingError } = await getExistingRecord(id);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });
    }

    let actorUserEmail: string | null = null;
    try {
      const body = await req.json();
      actorUserEmail = body?.actor_user_email ? String(body.actor_user_email).trim().toLowerCase() : null;
    } catch {}

    const actorUserId = await resolveProfileIdByEmail(actorUserEmail);

    await insertOperationalHistory({
      recordId: id,
      action: "deleted",
      oldValue: JSON.stringify(existing),
      actorUserId,
      actorUserEmail,
    });

    const { error } = await supabaseAdmin
      .from("agendamento_operational_records")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir registro operacional:", error);
    return NextResponse.json({ error: "Erro interno ao excluir registro" }, { status: 500 });
  }
}
