import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("portal_users")
      .select("id, email, role")
      .order("email", { ascending: true })

    if (error) {
      console.error("Erro ao buscar atendentes:", error)
      return NextResponse.json(
        { error: "Erro ao buscar atendentes" },
        { status: 500 }
      )
    }

    const formatted = (data ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? "",
      role: user.role ?? "Atendente"
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Erro em /api/agents:", error)
    return NextResponse.json(
      { error: "Erro interno ao buscar atendentes" },
      { status: 500 }
    )
  }
}
