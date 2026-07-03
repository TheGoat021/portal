import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  renderAgendamentoDocumentHtml,
type AgendamentoDocumentRecord,
  type DocumentType,
} from "@/lib/agendamentoDocument";

function isDocumentType(value: string): value is DocumentType {
  return value === "voucher" || value === "declaracao";
}

function isMissingSchemaColumn(message: string | undefined, column: string) {
  const value = String(message || "");
  return value.includes("schema cache") && value.includes(column);
}

export async function GET(req: NextRequest) {
  try {
    const recordId = req.nextUrl.searchParams.get("recordId")?.trim() || "";
    const documentTypeRaw = req.nextUrl.searchParams.get("documentType")?.trim() || "";
    const issuerName = req.nextUrl.searchParams.get("issuerName")?.trim() || "";

    if (!recordId) {
      return NextResponse.json({ error: "recordId e obrigatorio" }, { status: 400 });
    }

    if (!isDocumentType(documentTypeRaw)) {
      return NextResponse.json({ error: "documentType invalido" }, { status: 400 });
    }

    let { data, error } = await supabaseAdmin
      .from("agendamento_operational_records")
      .select(
        "id, patient_name, plan_name, specialty_name, appointment_date, appointment_time, payment_due_date, payment_due_time, clinic_name, patient_city, payment_amount, document_additional_info"
      )
      .eq("id", recordId)
      .maybeSingle<AgendamentoDocumentRecord>();

    if (error && isMissingSchemaColumn(error.message, "document_additional_info")) {
      const fallback = await supabaseAdmin
        .from("agendamento_operational_records")
        .select(
          "id, patient_name, plan_name, specialty_name, appointment_date, appointment_time, payment_due_date, payment_due_time, clinic_name, patient_city, payment_amount"
        )
        .eq("id", recordId)
        .maybeSingle<AgendamentoDocumentRecord>();

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });
    }

    const html = renderAgendamentoDocumentHtml(documentTypeRaw, data, { issuerName });

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar documento de agendamento:", error);
    return NextResponse.json({ error: "Erro interno ao gerar documento" }, { status: 500 });
  }
}
