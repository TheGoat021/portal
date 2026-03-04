import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const USER_ID = "2863221c-a334-47c2-b7aa-db4fc02839aa"

export async function GET() {
  try {
    const { data: user } = await supabaseAdmin
      .from("arena_users")
      .select("*")
      .eq("id", USER_ID)
      .single()

    const { data: userCharacters } = await supabaseAdmin
      .from("user_characters")
      .select(`
        id,
        characters (
          id,
          name,
          anime,
          rarity,
          base_value,
          image_url
        )
      `)
      .eq("arena_user_id", USER_ID)

    const formatted = userCharacters?.map((uc: any) => ({
      id: uc.id,
      name: uc.characters.name,
      anime: uc.characters.anime,
      rarity: uc.characters.rarity,
      value: uc.characters.base_value,
      image: uc.characters.image_url,
    }))

    const totalValue = formatted?.reduce(
      (acc: number, c: any) => acc + c.value,
      0
    )

    return NextResponse.json({
      coins: user?.coins ?? 0,
      rolls: user?.rolls_available ?? 0,
      rank: user?.rank ?? "recruta",
      collectionCount: formatted?.length ?? 0,
      collectionValue: totalValue ?? 0,
      characters: formatted ?? [],
    })
  } catch {
    return NextResponse.json({ error: "Erro ao buscar perfil" }, { status: 500 })
  }
}