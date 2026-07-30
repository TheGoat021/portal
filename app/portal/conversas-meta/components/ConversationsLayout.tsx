// app/portal/conversas-meta/components/ConversationsMetaLayout.tsx

"use client"

import ConversationsList from "./ConversationList"
import ChatWindow from "./ChatWindow"
import ClientDetails from "./ClientDetails"

interface Props {
  selectedConversationId: string | null
  onSelectConversation: (id: string | null) => void
  currentUser: {
    id: string
    role: string
    email: string
  }
}

export default function ConversationsMetaLayout({
  selectedConversationId,
  onSelectConversation,
  currentUser
}: Props) {
  return (
    <div className="relative h-[calc(100vh-64px)] overflow-hidden rounded-[36px] border border-slate-200/90 bg-[linear-gradient(180deg,#e8eef8,#dde7f5)] p-3 shadow-[0_20px_48px_rgba(94,109,138,0.16)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-indigo-200/24 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-80 rounded-full bg-cyan-100/22 blur-3xl" />
      </div>

      <div className="relative z-10 grid h-full min-h-0 grid-cols-12 gap-3">
        <div className="col-span-4 flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(94,109,138,0.1)]">
          <div className="h-full min-h-0 flex-1 overflow-y-auto">
            <ConversationsList
              selectedConversationId={selectedConversationId}
              onSelectConversation={onSelectConversation}
              currentUser={currentUser}
            />
          </div>
        </div>

        <div className="col-span-5 flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-sky-100 bg-[#f8fbff] shadow-[0_12px_28px_rgba(94,109,138,0.1)]">
          <div className="h-full min-h-0 flex-1 overflow-y-auto">
            <ChatWindow
              selectedConversationId={selectedConversationId}
              onCloseConversation={() => onSelectConversation(null)}
              currentUser={{
                id: currentUser.id,
                email: currentUser.email
              }}
            />
          </div>
        </div>

        <div className="col-span-3 flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_12px_28px_rgba(94,109,138,0.1)]">
          <div className="h-full min-h-0 flex-1 overflow-y-auto">
            <ClientDetails
              selectedConversationId={selectedConversationId}
              currentUser={{
                id: currentUser.id,
                email: currentUser.email
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
