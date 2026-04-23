import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeEmail } from "@/lib/agendamentoOperational";

export async function GET(req: NextRequest) {
  try {
    const attendantEmail = normalizeEmail(req.nextUrl.searchParams.get("attendant_email"));
    const from = req.nextUrl.searchParams.get("from")?.trim() || "";
    const to = req.nextUrl.searchParams.get("to")?.trim() || "";

    let query = supabaseAdmin
      .from("agendamento_operational_records")
      .select("id, record_type, status, payment_status, appointment_date, cancellation_reason, attendant_email, updated_at");

    if (attendantEmail) query = query.ilike("attendant_email", attendantEmail);
    if (from) query = query.gte("appointment_date", from);
    if (to) query = query.lte("appointment_date", to);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const today = new Date().toISOString().slice(0, 10);

    const response = {
      totals: {
        agendamentos_do_dia: rows.filter((item) => item.record_type === "agendamento" && item.appointment_date === today).length,
        ficticios_hoje: rows.filter((item) => item.record_type === "ficticio" && item.appointment_date === today).length,
        consultas_a_pagar: rows.filter((item) => item.payment_status === "a_pagar").length,
        cancelamentos: rows.filter((item) => item.record_type === "cancelamento").length,
        comercial_ligacoes: rows.filter((item) => item.record_type === "comercial_ligacoes").length,
        exames_ligacoes: rows.filter((item) => item.record_type === "exames_ligacoes").length,
      },
      by_type: {
        agendamento: rows.filter((item) => item.record_type === "agendamento"),
        ficticio: rows.filter((item) => item.record_type === "ficticio"),
        cancelamento: rows.filter((item) => item.record_type === "cancelamento"),
        comercial_ligacoes: rows.filter((item) => item.record_type === "comercial_ligacoes"),
        exames_ligacoes: rows.filter((item) => item.record_type === "exames_ligacoes"),
      },
      recent_activity: [...rows]
        .sort((a, b) => Date.parse(String(b.updated_at || "")) - Date.parse(String(a.updated_at || "")))
        .slice(0, 10),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao montar dashboard operacional:", error);
    return NextResponse.json({ error: "Erro interno ao montar dashboard" }, { status: 500 });
  }
}

