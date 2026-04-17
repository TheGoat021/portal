import { NextResponse } from "next/server"
import { syncAllWhatsAppLeads } from "@/lib/leadSync"

export async function POST() {
  try {
    const result = await syncAllWhatsAppLeads({
      includeLegacy: true,
      includeMeta: true
    })

    return NextResponse.json({
      success: result.errors.length === 0,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro interno ao sincronizar leads do WhatsApp" },
      { status: 500 }
    )
  }
}
