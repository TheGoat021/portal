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
    <div className="h-[calc(100vh-64px)] bg-[#F7F8FA] grid grid-cols-12">
      {/* CONVERSATIONS */}
      <div className="col-span-4 bg-white border-r border-gray-200 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <ConversationsList
            selectedConversationId={selectedConversationId}
            onSelectConversation={onSelectConversation}
            currentUser={currentUser}
          />
        </div>
      </div>

      {/* CHAT */}
      <div className="col-span-5 bg-white border-r border-gray-200 flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <ChatWindow
            selectedConversationId={selectedConversationId}
            currentUser={{
              id: currentUser.id,
              email: currentUser.email
            }}
          />
        </div>
      </div>

      {/* CLIENT DETAILS */}
      <div className="col-span-3 bg-white flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <ClientDetails
            selectedConversationId={selectedConversationId}
          />
        </div>
      </div>
    </div>
  )
}