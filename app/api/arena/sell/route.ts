import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const USER_ID = "2863221c-a334-47c2-b7aa-db4fc02839aa"

export async function POST(req: Request) {
  try {
    const { characterId } = await req.json()

    if (!characterId) {
      return NextResponse.json(
        { error: "ID do personagem é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar registro do personagem do usuário
    const { data: record, error } = await supabaseAdmin
      .from("user_characters")
      .select(`
        id,
        characters (
          id,
          base_value,
          available_supply
        )
      `)
      .eq("id", characterId)
      .single()

    if (error || !record) {
      return NextResponse.json(
        { error: "Personagem não encontrado" },
        { status: 404 }
      )
    }

    // Supabase pode tipar como array
    const characterData = Array.isArray(record.characters)
      ? record.characters[0]
      : record.characters

    if (!characterData) {
      return NextResponse.json(
        { error: "Dados do personagem inválidos" },
        { status: 400 }
      )
    }

    const value = characterData.base_value
    const characterDbId = characterData.id

    // 1️⃣ Remover da coleção do usuário
    const { error: deleteError } = await supabaseAdmin
      .from("user_characters")
      .delete()
      .eq("id", characterId)

    if (deleteError) {
      return NextResponse.json(
        { error: "Erro ao remover personagem" },
        { status: 500 }
      )
    }

    // 2️⃣ Incrementar supply
    const { data: characterRow } = await supabaseAdmin
      .from("characters")
      .select("available_supply")
      .eq("id", characterDbId)
      .single()

    await supabaseAdmin
      .from("characters")
      .update({
        available_supply: (characterRow?.available_supply ?? 0) + 1,
      })
      .eq("id", characterDbId)

    // 3️⃣ Adicionar moedas ao usuário
    const { data: userRow } = await supabaseAdmin
      .from("arena_users")
      .select("coins")
      .eq("id", USER_ID)
      .single()

    await supabaseAdmin
      .from("arena_users")
      .update({
        coins: (userRow?.coins ?? 0) + value,
      })
      .eq("id", USER_ID)

    return NextResponse.json({ success: true })

  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno ao vender personagem" },
      { status: 500 }
    )
  }
}