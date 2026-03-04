import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("http://167.71.247.30:4000/qr", {
      cache: "no-store"
    })

    if (!response.ok) {
      return NextResponse.json(
        { qr: null, error: "WhatsApp server offline" },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json({ qr: data.qr ?? null })
  } catch (error) {
    return NextResponse.json(
      { qr: null, error: "Erro ao conectar com WhatsApp server" },
      { status: 500 }
    )
  }
}