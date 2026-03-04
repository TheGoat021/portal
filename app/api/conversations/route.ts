import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch("http://167.71.247.30:4000/conversations", {
      cache: "no-store"
    })

    if (!res.ok) {
      throw new Error("Erro no servidor 4000")
    }

    const data = await res.json()

    // 🔥 Mapeia para o formato que o front espera
    const formatted = data.map((conv: any) => ({
  id: conv.id, // 🔥 agora é UUID real
  name: conv.phone,
  lastMessage: conv.last_message
}))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Erro ao buscar conversas" },
      { status: 500 }
    )
  }
}