"use client"

import { Clock3, Headset, PauseCircle, PhoneIncoming, UserRoundSearch, WifiOff } from "lucide-react"
import AgentCard from "@/components/voice/AgentCard"
import KPIHeader from "@/components/voice/KPIHeader"
import { useVoiceData } from "@/lib/voice/api"

export default function VoiceAgentsPage() {
  const { calls, agents } = useVoiceData()
  const activeCallMap = new Map(calls.map((call) => [call.id, call.phone]))

  return (
    <div className="space-y-6">
      <KPIHeader
        title="Monitoramento de ramais"
        description="Grid operacional moderno para substituir o painel antigo, com leitura rapida por status e tempo em cada estado."
        items={[
          {
            label: "Disponiveis",
            value: String(agents.filter((agent) => agent.status === "available").length),
            hint: "Operadores aptos para receber novas chamadas.",
            icon: <Headset className="h-4 w-4" />
          },
          {
            label: "Em chamada",
            value: String(agents.filter((agent) => agent.status === "in_call").length),
            hint: "Ramais ocupados em atendimento agora.",
            icon: <PhoneIncoming className="h-4 w-4" />
          },
          {
            label: "Em pausa",
            value: String(agents.filter((agent) => agent.status === "paused").length),
            hint: "Pausas operacionais e intervalos monitorados.",
            icon: <PauseCircle className="h-4 w-4" />
          },
          {
            label: "Offline",
            value: String(agents.filter((agent) => agent.status === "offline").length),
            hint: "Ramais deslogados ou sem registro ativo.",
            icon: <WifiOff className="h-4 w-4" />
          },
          {
            label: "Tocando",
            value: String(agents.filter((agent) => agent.status === "ringing").length),
            hint: "Chamadas em oferta, aguardando aceite.",
            icon: <Clock3 className="h-4 w-4" />
          },
          {
            label: "Total de ramais",
            value: String(agents.length),
            hint: "Base total do time de atendimento no Voice.",
            icon: <UserRoundSearch className="h-4 w-4" />
          }
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            activePhone={agent.current_call_id ? activeCallMap.get(agent.current_call_id) || null : null}
          />
        ))}
      </section>
    </div>
  )
}
