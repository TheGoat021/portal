import "dotenv/config"
import axios from "axios"
import { supabaseAdmin } from "../lib/supabaseAdmin"

type Rarity = "comum" | "raro" | "epico" | "lendario"

const famousAnimes = [
  "Naruto",
  "Dragon Ball Z",
  "One Piece",
  "Attack on Titan",
  "Jujutsu Kaisen",
  "Demon Slayer",
  "Death Note",
  "Bleach",
  "My Hero Academia"
]

function getBaseValue(rarity: Rarity): number {
  switch (rarity) {
    case "comum": return 10
    case "raro": return 50
    case "epico": return 200
    case "lendario": return 800
  }
}

function getSupply(rarity: Rarity): number {
  switch (rarity) {
    case "comum": return 10
    case "raro": return 6
    case "epico": return 4
    case "lendario": return 2
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function safeRequest(url: string, retries = 3) {
  try {
    return await axios.get(url)
  } catch (err: any) {
    if (err.response?.status === 429 && retries > 0) {
      console.log("⏳ Rate limit... esperando 3s")
      await sleep(3000)
      return safeRequest(url, retries - 1)
    }
    throw err
  }
}

async function getAnimeId(name: string) {
  const res = await safeRequest(
    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(name)}&limit=1`
  )
  return res.data?.data?.[0]?.mal_id
}

async function importCharacters() {
  try {
    console.log("🚀 Importando personagens com raridade fixa...")

    let allCharacters: any[] = []

    for (const animeName of famousAnimes) {
      console.log(`🎬 Buscando anime: ${animeName}`)

      const animeId = await getAnimeId(animeName)
      if (!animeId) continue

      await sleep(2000)

      const res = await safeRequest(
        `https://api.jikan.moe/v4/anime/${animeId}/characters`
      )

      const characters = res.data?.data || []

      const mains = characters.filter((c: any) => c.role === "Main")
      const supporting = characters.filter((c: any) => c.role !== "Main")

      // 👇 Raridade fixa baseada na posição
      mains.forEach((entry: any, index: number) => {
        let rarity: Rarity

        if (index === 0) {
          rarity = "lendario"
        } else if (index <= 3) {
          rarity = "epico"
        } else {
          rarity = "raro"
        }

        allCharacters.push({
          name: entry.character.name,
          image_url: entry.character.images?.jpg?.image_url,
          anime: animeName,
          rarity
        })
      })

      // Supporting = comum
      supporting.slice(0, 12).forEach((entry: any) => {
        allCharacters.push({
          name: entry.character.name,
          image_url: entry.character.images?.jpg?.image_url,
          anime: animeName,
          rarity: "comum"
        })
      })

      await sleep(2500)
    }

    // remove duplicados
    const unique = Array.from(
      new Map(allCharacters.map(c => [c.name, c])).values()
    )

    console.log(`🎮 Total final: ${unique.length}`)

    const inserts = unique.map((char) => ({
      name: char.name,
      anime: char.anime,
      image_url: char.image_url,
      rarity: char.rarity,
      base_value: getBaseValue(char.rarity),
      total_supply: getSupply(char.rarity),
      available_supply: getSupply(char.rarity),
    }))

    const { error } = await supabaseAdmin
      .from("characters")
      .insert(inserts)

    if (error) {
      console.error("❌ Erro ao inserir:", error)
    } else {
      console.log("✅ Personagens com raridade fixa importados!")
    }

  } catch (err) {
    console.error("❌ Erro geral:", err)
  }
}

importCharacters()