"use client"

import { useState, useEffect, useRef } from "react"

type Character = {
  name: string
  image: string
  rarity: "comum" | "raro" | "epico" | "lendario"
  anime: string
  value: number
}

export default function ArenaPage() {
  const [loading, setLoading] = useState(false)
  const [character, setCharacter] = useState<Character | null>(null)
  const [showRollModal, setShowRollModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const chatRef = useRef<HTMLDivElement>(null)

  async function fetchChat() {
    const res = await fetch("/api/arena/chat")
    const data = await res.json()
    setChatMessages(data.reverse())
  }

  async function fetchProfile() {
    const res = await fetch("/api/arena/profile")
    const data = await res.json()
    setProfile(data)
  }

  async function handleRoll() {
    setLoading(true)

    const res = await fetch("/api/arena/roll", { method: "POST" })
    const data = await res.json()

    if (data.success) {
      setCharacter(data.character)
      setShowRollModal(true)
      await fetchChat()
    } else {
      alert(data.error)
    }

    setLoading(false)
  }

  async function handleSell(characterId: string) {
    const res = await fetch("/api/arena/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId }),
    })

    const data = await res.json()

    if (data.success) {
      await fetchProfile()
    } else {
      alert(data.error)
    }
  }

  function rarityStyle(rarity: string) {
    switch (rarity) {
      case "comum":
        return "border-gray-400 shadow-gray-400/40"
      case "raro":
        return "border-blue-500 shadow-blue-500/50"
      case "epico":
        return "border-purple-500 shadow-purple-500/60"
      case "lendario":
        return "border-yellow-400 shadow-yellow-400/70"
      default:
        return ""
    }
  }

  useEffect(() => {
    fetchChat()
  }, [])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chatMessages])

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 relative">

      <div className="grid grid-cols-12 gap-6 h-[80vh]">

        {/* CHAT */}
        <div className="col-span-9 bg-neutral-900 rounded-2xl p-4 flex flex-col">
          <h2 className="text-xl font-bold mb-4">💬 Chat Global</h2>

          <div
            ref={chatRef}
            className="flex-1 bg-neutral-800 rounded-xl p-4 overflow-y-auto space-y-2"
          >
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className="text-sm bg-neutral-700 p-2 rounded-lg"
              >
                {msg.message}
              </div>
            ))}
          </div>
        </div>

        {/* RANKING */}
        <div className="col-span-3 bg-neutral-900 rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">🏆 Ranking</h2>
          <p className="text-neutral-400 text-sm">
            (Ranking será implementado aqui)
          </p>
        </div>
      </div>

      {/* BOTÕES */}
      <div className="mt-6 flex justify-center gap-4">
        <button
          onClick={handleRoll}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition disabled:opacity-50"
        >
          🎲 Girar
        </button>

        <button
          onClick={async () => {
            await fetchProfile()
            setShowProfileModal(true)
          }}
          className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-xl font-semibold transition"
        >
          👤 Perfil
        </button>
      </div>

      {/* MODAL ROLL */}
      {showRollModal && character && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div
            className={`w-80 bg-neutral-900 rounded-2xl p-6 border-4 shadow-2xl ${rarityStyle(
              character.rarity
            )}`}
          >
            <img
              src={character.image}
              alt={character.name}
              className="rounded-xl mb-4"
            />

            <h3 className="text-xl font-bold">{character.name}</h3>
            <p className="text-sm text-neutral-400">{character.anime}</p>
            <p className="mt-2 uppercase">{character.rarity}</p>

            <p className="mt-3 text-lg font-bold text-emerald-400">
              💰 {character.value} moedas
            </p>

            <button
              onClick={() => setShowRollModal(false)}
              className="mt-6 w-full py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL PERFIL */}
      {showProfileModal && profile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto">
          <div className="w-[700px] bg-neutral-900 rounded-2xl p-6 max-h-[85vh] overflow-y-auto">

            <h3 className="text-2xl font-bold mb-4">👤 Perfil</h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-neutral-800 p-4 rounded-xl">
                <p className="text-sm text-neutral-400">Moedas</p>
                <p className="text-xl font-bold text-emerald-400">
                  💰 {profile.coins}
                </p>
              </div>

              <div className="bg-neutral-800 p-4 rounded-xl">
                <p className="text-sm text-neutral-400">Rolls</p>
                <p className="text-xl font-bold">
                  🎟️ {profile.rolls}
                </p>
              </div>

              <div className="bg-neutral-800 p-4 rounded-xl">
                <p className="text-sm text-neutral-400">Patente</p>
                <p className="text-xl font-bold">
                  🎖️ {profile.rank}
                </p>
              </div>
            </div>

            <h4 className="text-lg font-bold mb-3">
              📦 Coleção ({profile.collectionCount})
            </h4>

            <div className="space-y-3">
              {profile.characters.map((char: any) => (
                <div
                  key={char.id}
                  className="bg-neutral-800 p-3 rounded-xl flex justify-between items-center"
                >
                  <div>
                    <button
                      onClick={() => setSelectedCharacter(char)}
                      className="font-semibold hover:underline"
                    >
                      {char.name}
                    </button>
                    <p className="text-sm text-neutral-400">
                      {char.anime} • {char.rarity}
                    </p>
                    <p className="text-sm text-emerald-400">
                      💰 {char.value}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSell(char.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-sm"
                  >
                    Vender
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowProfileModal(false)}
              className="mt-6 w-full py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL IMAGEM */}
      {selectedCharacter && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-neutral-900 p-6 rounded-2xl w-80">
            <img
              src={selectedCharacter.image}
              alt={selectedCharacter.name}
              className="rounded-xl mb-4"
            />
            <h3 className="text-lg font-bold">
              {selectedCharacter.name}
            </h3>
            <p className="text-neutral-400">
              {selectedCharacter.anime}
            </p>

            <button
              onClick={() => setSelectedCharacter(null)}
              className="mt-4 w-full py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}