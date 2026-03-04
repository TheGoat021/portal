import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const USER_ID = "2863221c-a334-47c2-b7aa-db4fc02839aa"

type Rarity = "comum" | "raro" | "epico" | "lendario"

function applyRankBonus(
  baseChances: Record<Rarity, number>,
  rank: string
) {
  const bonuses: Record<string, number> = {
    recruta: 0,
    soldado: 0.02,
    capitao: 0.05,
    major: 0.1,
    general: 0.2,
  }

  const bonus = bonuses[rank] || 0
  const adjusted = { ...baseChances }

  adjusted.epico *= 1 + bonus
  adjusted.lendario *= 1 + bonus

  const total =
    adjusted.comum +
    adjusted.raro +
    adjusted.epico +
    adjusted.lendario

  adjusted.comum /= total
  adjusted.raro /= total
  adjusted.epico /= total
  adjusted.lendario /= total

  return adjusted
}

function rollRarity(chances: Record<Rarity, number>): Rarity {
  const rand = Math.random()
  let cumulative = 0

  for (const rarity of Object.keys(chances) as Rarity[]) {
    cumulative += chances[rarity]
    if (rand <= cumulative) return rarity
  }

  return "comum"
}

export async function POST() {
  try {
    const { data: user } = await supabaseAdmin
      .from("arena_users")
      .select("*")
      .eq("id", USER_ID)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    if (user.rolls_available <= 0) {
      return NextResponse.json(
        { error: "Sem rolls disponíveis" },
        { status: 400 }
      )
    }

    const baseChances: Record<Rarity, number> = {
      comum: 0.6,
      raro: 0.25,
      epico: 0.1,
      lendario: 0.05,
    }

    const chances = applyRankBonus(baseChances, user.rank)
    const rarity = rollRarity(chances)

    const { data: characters } = await supabaseAdmin
      .from("characters")
      .select("*")
      .eq("rarity", rarity)
      .gt("available_supply", 0)

    if (!characters || characters.length === 0) {
      return NextResponse.json(
        { error: "Nenhum personagem disponível" },
        { status: 400 }
      )
    }

    const randomCharacter =
      characters[Math.floor(Math.random() * characters.length)]

    // ↓ diminui supply
    await supabaseAdmin
      .from("characters")
      .update({
        available_supply: randomCharacter.available_supply - 1,
      })
      .eq("id", randomCharacter.id)

    // ↓ adiciona à coleção
    await supabaseAdmin.from("user_characters").insert({
      arena_user_id: USER_ID,
      character_id: randomCharacter.id,
    })

    // ↓ remove roll
    await supabaseAdmin
      .from("arena_users")
      .update({
        rolls_available: user.rolls_available - 1,
      })
      .eq("id", USER_ID)

    // 🔥 NOVO: inserir mensagem no chat
    const rarityEmoji: Record<Rarity, string> = {
  comum: "⚪",
  raro: "🔵",
  epico: "💜",
  lendario: "👑",
}

const emoji = rarityEmoji[rarity]

await supabaseAdmin.from("arena_chat_messages").insert({
  user_id: USER_ID,
  message: `${emoji} Tirou ${randomCharacter.name} (${rarity.toUpperCase()})`,
})

    return NextResponse.json({
      success: true,
      character: {
        name: randomCharacter.name,
        image: randomCharacter.image_url,
        rarity: randomCharacter.rarity,
        anime: randomCharacter.anime,
        value: randomCharacter.base_value,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}