import { NextRequest, NextResponse } from "next/server"
import { syncAllWhatsAppLeads } from "@/lib/leadSync"

export const runtime = "nodejs"

function isAuthorized(req: NextRequest) {
  const cronHeader = req.headers.get("x-vercel-cron")
  if (cronHeader) return true

  const token = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret")
  return Boolean(process.env.CRON_SECRET && token && token === process.env.CRON_SECRET)
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncAllWhatsAppLeads({
      includeLegacy: true,
      includeMeta: true
    })

    return NextResponse.json({
      ok: true,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao sincronizar leads"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
