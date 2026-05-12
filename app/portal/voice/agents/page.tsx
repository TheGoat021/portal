"use client"

import { Clock3, Headset, PauseCircle, PhoneIncoming, UserRoundSearch, WifiOff } from "lucide-react"
import AgentCard from "@/components/voice/AgentCard"
import AgentProvisionPanel from "@/components/voice/AgentProvisionPanel"
import KPIHeader from "@/components/voice/KPIHeader"
import {
  deriveSoftphoneIdentity,
  useCurrentVoiceAgent,
  useVoiceData,
  useVoiceProvisionDirectory
} from "@/lib/voice/api"
import { useAuth } from "@/store/authStore"

export default function VoiceAgentsPage() {
  const { user } = useAuth()
  const { calls, agents: apiAgents, reload } = useVoiceData()
  const {
    agents: directoryAgents,
    unassignedUsers,
    loading: loadingDirectory,
    errorMessage: directoryErrorMessage,
    warningMessage: directoryWarningMessage,
    reload: reloadDirectory,
    provision
  } = useVoiceProvisionDirectory()
  const agents = directoryAgents.length > 0 ? directoryAgents : apiAgents
  const currentAgent = useCurrentVoiceAgent(agents, user?.id)
  const currentIdentity = deriveSoftphoneIdentity(currentAgent)
  const activeCallMap = new Map(calls.map((call) => [call.id, call.phone]))
  const orderedAgents = [...agents].sort((left, right) => {
    if (left.user_id === user?.id) return -1
    if (right.user_id === user?.id) return 1
    return left.name.localeCompare(right.name)
  })

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

      {currentAgent ? (
        <section className="rounded-[22px] border border-cyan-200 bg-[linear-gradient(135deg,rgba(236,254,255,0.92)_0%,rgba(255,255,255,1)_100%)] p-4 shadow-[0_14px_36px_-30px_rgba(8,145,178,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
            Meu ramal
          </p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-950">{currentAgent.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                Ramal {currentAgent.extension} • Login SIP {currentIdentity?.sipUsername || currentAgent.extension}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                O softphone do Axion usa esse ramal automaticamente quando voce estiver autenticado.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm text-slate-700">
              Status atual: <span className="font-semibold text-slate-950">{currentAgent.status}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[22px] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.96)_0%,rgba(255,255,255,1)_100%)] p-4 shadow-[0_14px_36px_-30px_rgba(217,119,6,0.25)]">
          <p className="text-sm font-medium text-amber-900">
            Este usuario ainda nao tem um ramal do Axion Voice vinculado. Assim que o cadastro em `voice_agents` for criado com o seu `user_id` de `profiles`, o softphone vai preencher login e extensao automaticamente.
          </p>
        </section>
      )}

      <AgentProvisionPanel
        users={unassignedUsers}
        loading={loadingDirectory}
        errorMessage={directoryErrorMessage}
        warningMessage={directoryWarningMessage}
        onReload={reloadDirectory}
        onProvision={async (input) => {
          await provision(input)
          await reloadDirectory()
          await reload()
        }}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {orderedAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isCurrentUser={agent.user_id === user?.id}
            activePhone={agent.current_call_id ? activeCallMap.get(agent.current_call_id) || null : null}
          />
        ))}
      </section>
    </div>
  )
}
