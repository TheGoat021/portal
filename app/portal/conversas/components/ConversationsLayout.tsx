"use client"

import ConversationsList from "./ConversationsList"
import ChatWindow from "./ChatWindow"
import ClientDetails from "./ClientDetails"

interface Props {
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
  currentUser: {
    id: string
    role: string
    email: string
  }
}

export default function ConversationsLayout({
  selectedConversationId,
  onSelectConversation,
  currentUser
}: Props) {
  return (
    <div className="relative h-[calc(100vh-64px)] overflow-hidden rounded-[36px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.54),rgba(242,249,248,0.78))] p-3 shadow-[0_30px_80px_rgba(148,163,184,0.16)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-80 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 grid h-full min-h-0 grid-cols-12 gap-3">
        <div className="col-span-4 flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/58 shadow-[0_18px_44px_rgba(148,163,184,0.12)] backdrop-blur-xl">
          <div className="h-full min-h-0 flex-1 overflow-y-auto">
          <ConversationsList
            selectedConversationId={selectedConversationId}
            onSelectConversation={onSelectConversation}
            currentUser={currentUser}
          />
        </div>
        </div>

        <div className="col-span-5 flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/50 shadow-[0_18px_44px_rgba(148,163,184,0.12)] backdrop-blur-xl">
          <div className="h-full min-h-0 flex-1 overflow-y-auto">
          <ChatWindow
            selectedConversationId={selectedConversationId}
            onCloseConversation={() => onSelectConversation("")}
            currentUser={{
              id: currentUser.id,
              email: currentUser.email
            }}
          />
        </div>
        </div>

        <div className="col-span-3 flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/58 shadow-[0_18px_44px_rgba(148,163,184,0.12)] backdrop-blur-xl">
          <div className="h-full min-h-0 flex-1 overflow-y-auto">
          <ClientDetails
            selectedConversationId={selectedConversationId}
          />
        </div>
      </div>
      </div>
    </div>
  )
}
