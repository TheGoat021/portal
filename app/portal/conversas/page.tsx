"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import ConversationsLayout from "./components/ConversationsLayout"

type UserProfile = {
  id: string
  role: string
}

export default function ConversasPage() {
  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null)

  const [currentUser, setCurrentUser] =
    useState<UserProfile | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()

      if (!data?.user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", data.user.id)
        .single()

      if (profile) {
        setCurrentUser(profile)
      }
    }

    loadUser()
  }, [])

  // 🔥 ESSENCIAL: evita undefined
  if (!currentUser) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <ConversationsLayout
      selectedConversationId={selectedConversationId}
      onSelectConversation={setSelectedConversationId}
      currentUser={currentUser}
    />
  )
}