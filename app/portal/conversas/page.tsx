"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import ConversationsLayout from "./components/ConversationsLayout"

type UserProfile = {
  id: string
  role: string
  email: string
}

export default function ConversasPage() {
  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null)

  const [currentUser, setCurrentUser] =
    useState<UserProfile | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.error("Erro ao buscar usuário autenticado:", error)
        return
      }

      if (!data?.user) return

      const authUser = data.user

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", authUser.id)
        .single()

      if (profileError) {
        console.error("Erro ao buscar profile:", profileError)
        return
      }

      if (profile) {
        setCurrentUser({
          id: profile.id,
          role: profile.role,
          email: authUser.email ?? ""
        })
      }
    }

    loadUser()
  }, [])

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