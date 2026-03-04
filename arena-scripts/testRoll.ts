import "dotenv/config"
import { supabaseAdmin } from "../lib/supabaseAdmin"

const USER_ID = "2863221c-a334-47c2-b7aa-db4fc02839aa"

type Rarity = "comum" | "raro" | "epico" | "lendario" | "mitico"

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
  adjusted.mitico *= 1 + bonus

  const total =
    adjusted.comum +
    adjusted.raro +
    adjusted.epico +
    adjusted.lendario +
    adjusted.mitico

  adjusted.comum /= total
  adjusted.raro /= total
  adjusted.epico /= total
  adjusted.lendario /= total
  adjusted.mitico /= total

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

async function testRoll() {
  console.log("🎲 Executando roll...")

  const { data: user } = await supabaseAdmin
    .from("arena_users")
    .select("*")
    .eq("id", USER_ID)
    .single()

  if (!user) {
    console.log("❌ Usuário não encontrado")
    return
  }

  if (user.rolls_available <= 0) {
    console.log("❌ Sem rolls disponíveis")
    return
  }

  const baseChances: Record<Rarity, number> = {
    comum: 0.6,
    raro: 0.25,
    epico: 0.1,
    lendario: 0.04,
    mitico: 0.01,
  }

  const chances = applyRankBonus(baseChances, user.rank)
  const rarity = rollRarity(chances)

  console.log(`✨ Raridade sorteada: ${rarity}`)

  const { data: characters } = await supabaseAdmin
    .from("characters")
    .select("*")
    .eq("rarity", rarity)
    .gt("available_supply", 0)

  if (!characters || characters.length === 0) {
    console.log("❌ Nenhum personagem disponível dessa raridade")
    return
  }

  const randomCharacter =
    characters[Math.floor(Math.random() * characters.length)]

  console.log(`🏆 Você tirou: ${randomCharacter.name}`)

  // diminuir supply
  await supabaseAdmin
    .from("characters")
    .update({
      available_supply: randomCharacter.available_supply - 1,
    })
    .eq("id", randomCharacter.id)

  // adicionar ao usuário
  await supabaseAdmin.from("user_characters").insert({
    arena_user_id: USER_ID,
    character_id: randomCharacter.id,
  })

  // remover roll
  await supabaseAdmin
    .from("arena_users")
    .update({
      rolls_available: user.rolls_available - 1,
    })
    .eq("id", USER_ID)

  console.log("✅ Roll concluído com sucesso!")
}

testRoll()