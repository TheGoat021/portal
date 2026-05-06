"use client"

import { AudioLines, CalendarClock, PhoneCall, UserRound } from "lucide-react"
import CallTable from "@/components/voice/CallTable"
import KPIHeader from "@/components/voice/KPIHeader"
import { formatSeconds, useVoiceData, useVoiceDerivedData } from "@/lib/voice/api"

export default function VoiceCallsPage() {
  const { calls, agents, queues } = useVoiceData()
  const { tableRows, metrics } = useVoiceDerivedData(calls, agents, queues)

  return (
    <div className="space-y-6">
      <KPIHeader
        title="Historico de ligacoes"
        description="Tabela moderna para consulta operacional e auditoria, pronta para filtros por agente, fila, periodo e status."
        items={[
          {
            label: "Registros",
            value: String(tableRows.length),
            hint: "Chamadas carregadas no intervalo atual.",
            icon: <PhoneCall className="h-4 w-4" />
          },
          {
            label: "Duracao media",
            value: formatSeconds(metrics.avgHandleSeconds),
            hint: "Tempo medio de conversa das chamadas concluídas.",
            icon: <AudioLines className="h-4 w-4" />
          },
          {
            label: "Agentes ativos",
            value: String(agents.filter((agent) => agent.status !== "offline").length),
            hint: "Equipe elegivel para atendimento ou acompanhamento.",
            icon: <UserRound className="h-4 w-4" />
          },
          {
            label: "Filas monitoradas",
            value: String(queues.length),
            hint: "Filas presentes na operacao do Axion Voice.",
            icon: <CalendarClock className="h-4 w-4" />
          }
        ]}
      />

      <CallTable
        rows={tableRows}
        agents={[...new Set(tableRows.map((row) => row.agentName))].filter(Boolean)}
        queues={[...new Set(tableRows.map((row) => row.queueName))].filter(Boolean)}
      />
    </div>
  )
}
