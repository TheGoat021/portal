"use client"

import AgentMonitorCard from "@/components/voice/AgentMonitorCard"
import AgentProvisionPanel from "@/components/voice/AgentProvisionPanel"
import MonitoringHero from "@/components/voice/MonitoringHero"
import QueueMonitorStrip from "@/components/voice/QueueMonitorStrip"
import { useVoiceMonitoringSnapshot } from "@/lib/voice/monitoring"
import { useVoiceData, useVoiceProvisionDirectory } from "@/lib/voice/api"
import { useAuth } from "@/store/authStore"

export default function VoiceAgentsPage() {
  const { user } = useAuth()
  const { reload } = useVoiceData()
  const {
    unassignedUsers,
    loading: loadingDirectory,
    errorMessage: directoryErrorMessage,
    warningMessage: directoryWarningMessage,
    reload: reloadDirectory,
    provision
  } = useVoiceProvisionDirectory()
  const {
    snapshot: monitoring,
    loading: monitoringLoading,
    errorMessage: monitoringErrorMessage,
    reload: reloadMonitoring
  } = useVoiceMonitoringSnapshot(user?.id)

  if (!monitoring) {
    return (
      <div className="space-y-5">
        <MonitoringHero
          title="Painel operacional de ramais e filas"
          description="Tela desenhada para supervisao em tempo real, com leitura compacta de filas, alertas visuais de espera e alta densidade para acompanhar muitos agentes simultaneamente."
          items={[
            { label: "Filas ativas", value: "--", hint: "Carregando snapshot operacional.", tone: "slate" },
            { label: "Em espera", value: "--", hint: "Sincronizando filas do monitoramento.", tone: "slate" },
            { label: "Disponiveis", value: "--", hint: "Carregando ramais do backend.", tone: "slate" },
            { label: "Tocando", value: "--", hint: "Aguardando eventos ativos.", tone: "slate" },
            { label: "Em ligacao", value: "--", hint: "Calculando chamadas atuais.", tone: "slate" },
            { label: "Offline", value: "--", hint: "Lendo status reais dos agentes.", tone: "slate" }
          ]}
        />

        <div className="rounded-[24px] border border-dashed border-[#d9e2ec] bg-white px-5 py-10 text-center text-sm text-slate-500">
          {monitoringErrorMessage
            ? monitoringErrorMessage
            : monitoringLoading
              ? "Carregando monitoramento em tempo real..."
              : "Aguardando snapshot do backend."}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <MonitoringHero
        title="Painel operacional de ramais e filas"
        description="Tela desenhada para supervisao em tempo real, com leitura compacta de filas, alertas visuais de espera e alta densidade para acompanhar muitos agentes simultaneamente."
        items={[
          {
            label: "Filas ativas",
            value: String(monitoring.summary.busyQueues),
            hint: `${monitoring.summary.totalQueues} filas monitoradas agora.`,
            tone: monitoring.summary.totalWaiting > 0 ? "sky" : "slate"
          },
          {
            label: "Em espera",
            value: String(monitoring.summary.totalWaiting),
            hint: "Clientes aguardando atendimento nas filas do painel.",
            tone:
              monitoring.summary.totalWaiting >= 4
                ? "rose"
                : monitoring.summary.totalWaiting >= 2
                  ? "amber"
                  : "emerald"
          },
          {
            label: "Disponiveis",
            value: String(monitoring.summary.availableAgents),
            hint: "Ramais livres para receber novas chamadas.",
            tone: "emerald"
          },
          {
            label: "Tocando",
            value: String(monitoring.summary.ringingAgents),
            hint: "Ofertas de chamadas em andamento agora.",
            tone: "amber"
          },
          {
            label: "Em ligacao",
            value: String(monitoring.summary.inCallAgents),
            hint: "Atendimentos ativos ou receptivos em curso.",
            tone: "sky"
          },
          {
            label: "Offline",
            value: String(monitoring.summary.offlineAgents),
            hint: "Ramais sem sessao ativa no momento.",
            tone: "slate"
          }
        ]}
      />

      <QueueMonitorStrip queues={monitoring.queueCards} />

      <section className="rounded-[24px] border border-[#d9e2ec] bg-white p-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.18)]">
        <div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Monitoramento dos ramais
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {monitoring.agentCards.map((agent) => (
            <AgentMonitorCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

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
          await reloadMonitoring()
        }}
      />
    </div>
  )
}
