"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type MetaConnection = {
  id: string
  display_phone_number?: string | null
  verified_name?: string | null
}

type QueueSettings = {
  connection_id: string
  auto_distribution_enabled: boolean
  max_simultaneous_enabled: boolean
  max_simultaneous_per_agent: number | null
  auto_close_inactive_enabled: boolean
  inactive_close_minutes: number | null
}

type CurrentUser = {
  id: string
  role: string
}

type QueueAgent = {
  id: string
  email: string
  role: string
  isActiveInQueue: boolean
  updatedAt?: string | null
}

type DistributionLog = {
  id: string
  conversation_id?: string | null
  conversation_wa_id?: string | null
  conversation_contact_name?: string | null
  department?: string | null
  status: string
  reason?: string | null
  selected_user_email?: string | null
  candidates_count?: number | null
  eligible_count?: number | null
  created_at: string
}

function defaultSettings(connectionId: string): QueueSettings {
  return {
    connection_id: connectionId,
    auto_distribution_enabled: true,
    max_simultaneous_enabled: false,
    max_simultaneous_per_agent: null,
    auto_close_inactive_enabled: false,
    inactive_close_minutes: null
  }
}

function isManagerRole(role: string) {
  const normalized = role.trim().toUpperCase()
  return (
    normalized === "DIRETORIA" ||
    normalized === "ADMIN" ||
    normalized === "ADMINISTRACAO" ||
    normalized === "ADMINISTRAÇÃO"
  )
}

export default function MetaQueueSettingsPage() {
  const [connections, setConnections] = useState<MetaConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState("")
  const [settings, setSettings] = useState<QueueSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusText, setStatusText] = useState("")
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [queueAgents, setQueueAgents] = useState<QueueAgent[]>([])
  const [loadingQueueAgents, setLoadingQueueAgents] = useState(false)
  const [updatingAgentId, setUpdatingAgentId] = useState<string | null>(null)
  const [distributionLogs, setDistributionLogs] = useState<DistributionLog[]>([])
  const [loadingDistributionLogs, setLoadingDistributionLogs] = useState(false)

  const canManage = useMemo(
    () => Boolean(currentUser?.role && isManagerRole(currentUser.role)),
    [currentUser]
  )
  const formSettings = useMemo(() => {
    if (!selectedConnectionId) return null
    return settings ?? defaultSettings(selectedConnectionId)
  }, [selectedConnectionId, settings])

  const updateSettings = useCallback(
    (updater: (current: QueueSettings) => QueueSettings) => {
      if (!selectedConnectionId) return
      setSettings((prev) => updater(prev ?? defaultSettings(selectedConnectionId)))
    },
    [selectedConnectionId]
  )

  const loadCurrentUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) return

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", data.user.id)
      .single()

    if (!profile) return
    setCurrentUser({ id: profile.id, role: String(profile.role || "") })
  }, [])

  const loadConnections = useCallback(async () => {
    const res = await fetch("/api/meta/embedded-signup/connections", { cache: "no-store" })
    if (!res.ok) return

    const payload = await res.json()
    const list: MetaConnection[] = payload?.data ?? []
    setConnections(list)

    if (!selectedConnectionId && list.length > 0) {
      setSelectedConnectionId(list[0].id)
    }
  }, [selectedConnectionId])

  const loadSettings = useCallback(async (connectionId: string) => {
    if (!connectionId) return

    setLoading(true)
    setStatusText("")

    try {
      const res = await fetch(`/api/whatsapp-meta/queue-settings?connectionId=${encodeURIComponent(connectionId)}`, {
        cache: "no-store"
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) {
        setStatusText(payload?.error || "Erro ao carregar configuracoes de fila.")
        setSettings(defaultSettings(connectionId))
        return
      }

      setSettings((payload.data as QueueSettings) || defaultSettings(connectionId))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadQueueAgents = useCallback(
    async (connectionId: string) => {
      if (!currentUser || !canManage || !connectionId) {
        setQueueAgents([])
        return
      }

      setLoadingQueueAgents(true)
      try {
        const res = await fetch(
          `/api/whatsapp-meta/queue-agents?connectionId=${encodeURIComponent(connectionId)}&actorRole=${encodeURIComponent(currentUser.role || "")}`,
          { cache: "no-store" }
        )
        const payload = await res.json().catch(() => null)

        if (!res.ok || !payload?.ok) {
          setStatusText(payload?.error || "Erro ao carregar usuarios da fila.")
          setQueueAgents([])
          return
        }

        setQueueAgents((payload.data as QueueAgent[]) ?? [])
      } finally {
        setLoadingQueueAgents(false)
      }
    },
    [canManage, currentUser]
  )

  const loadDistributionLogs = useCallback(
    async (connectionId: string) => {
      if (!currentUser || !canManage || !connectionId) {
        setDistributionLogs([])
        return
      }

      setLoadingDistributionLogs(true)
      try {
        const res = await fetch(
          `/api/whatsapp-meta/queue-distribution-logs?connectionId=${encodeURIComponent(connectionId)}&actorRole=${encodeURIComponent(currentUser.role || "")}&limit=40`,
          { cache: "no-store" }
        )
        const payload = await res.json().catch(() => null)
        if (!res.ok || !payload?.ok) {
          setDistributionLogs([])
          return
        }
        setDistributionLogs((payload.data as DistributionLog[]) ?? [])
      } finally {
        setLoadingDistributionLogs(false)
      }
    },
    [canManage, currentUser]
  )

  useEffect(() => {
    loadCurrentUser()
    loadConnections()
  }, [loadConnections, loadCurrentUser])

  useEffect(() => {
    if (selectedConnectionId) {
      setSettings(defaultSettings(selectedConnectionId))
      loadSettings(selectedConnectionId)
      loadQueueAgents(selectedConnectionId)
      loadDistributionLogs(selectedConnectionId)
    } else {
      setLoading(false)
      setSettings(null)
      setQueueAgents([])
      setDistributionLogs([])
    }
  }, [loadDistributionLogs, loadQueueAgents, loadSettings, selectedConnectionId])

  const saveSettings = async () => {
    if (!currentUser || !selectedConnectionId || !canManage || saving) return

    const dataToSave = formSettings ?? defaultSettings(selectedConnectionId)

    try {
      setSaving(true)
      setStatusText("")

      const res = await fetch("/api/whatsapp-meta/queue-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          userId: currentUser.id,
          userRole: currentUser.role,
          autoDistributionEnabled: dataToSave.auto_distribution_enabled,
          maxSimultaneousEnabled: dataToSave.max_simultaneous_enabled,
          maxSimultaneousPerAgent: dataToSave.max_simultaneous_per_agent,
          autoCloseInactiveEnabled: dataToSave.auto_close_inactive_enabled,
          inactiveCloseMinutes: dataToSave.inactive_close_minutes
        })
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) {
        setStatusText(payload?.error || "Erro ao salvar configuracoes.")
        return
      }

      setSettings(payload.data as QueueSettings)
      setStatusText("Configuracoes de fila salvas com sucesso.")
    } finally {
      setSaving(false)
    }
  }

  const toggleQueueAgent = async (agent: QueueAgent) => {
    if (!currentUser || !selectedConnectionId || !canManage || updatingAgentId) return

    const nextValue = !agent.isActiveInQueue
    setUpdatingAgentId(agent.id)

    try {
      const res = await fetch("/api/whatsapp-meta/queue-agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          actorUserId: currentUser.id,
          actorUserRole: currentUser.role,
          targetUserId: agent.id,
          isActive: nextValue
        })
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) {
        setStatusText(payload?.error || "Erro ao atualizar usuario da fila.")
        return
      }

      setQueueAgents((prev) =>
        prev.map((item) =>
          item.id === agent.id ? { ...item, isActiveInQueue: nextValue, updatedAt: new Date().toISOString() } : item
        )
      )
      await loadDistributionLogs(selectedConnectionId)
    } finally {
      setUpdatingAgentId(null)
    }
  }

  function formatLogDate(value: string) {
    const d = new Date(value)
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-white p-4 md:p-6 space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5 space-y-3">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">Configuracoes de Fila (Meta)</h1>
          <p className="text-sm text-gray-600 mt-1">
            Defina as preferencias de distribuicao e encerramento automatico por conexao.
          </p>
        </div>

        <div className="max-w-xl">
          <label className="block text-xs text-gray-500 mb-1">Conexao Meta</label>
          <select
            value={selectedConnectionId}
            onChange={(e) => setSelectedConnectionId(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="">Selecione uma conexao</option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.display_phone_number || connection.verified_name || connection.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!canManage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          Seu perfil nao possui permissao para alterar essas configuracoes.
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 space-y-5">
        {statusText ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {statusText}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando configuracoes...</div>
        ) : !selectedConnectionId ? (
          <div className="text-sm text-gray-500">Selecione uma conexao para editar.</div>
        ) : !formSettings ? (
          <div className="text-sm text-gray-500">Selecione uma conexao para editar.</div>
        ) : (
          <>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formSettings.auto_distribution_enabled}
                onChange={(e) => updateSettings((prev) => ({ ...prev, auto_distribution_enabled: e.target.checked }))}
                disabled={!canManage}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Distribuicao automatica</span>
                <span className="block text-xs text-gray-500">
                  Quando ativa, novos atendimentos podem ser distribuidos automaticamente para operadores.
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formSettings.max_simultaneous_enabled}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      max_simultaneous_enabled: e.target.checked,
                      max_simultaneous_per_agent: e.target.checked
                        ? prev.max_simultaneous_per_agent || 3
                        : null
                    }))
                  }
                  disabled={!canManage}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">Limite de atendimentos simultaneos</span>
                  <span className="block text-xs text-gray-500">
                    Define quantos chats cada operador pode atender ao mesmo tempo.
                  </span>
                </span>
              </label>

              <div className="pl-7 max-w-xs">
                <input
                  type="number"
                  min={1}
                  value={formSettings.max_simultaneous_per_agent ?? ""}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      max_simultaneous_per_agent: e.target.value ? Number(e.target.value) : null
                    }))
                  }
                  disabled={!canManage || !formSettings.max_simultaneous_enabled}
                  className="w-full h-10 px-3 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
                  placeholder="Ex: 3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formSettings.auto_close_inactive_enabled}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      auto_close_inactive_enabled: e.target.checked,
                      inactive_close_minutes: e.target.checked ? prev.inactive_close_minutes || 30 : null
                    }))
                  }
                  disabled={!canManage}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">Encerrar por inatividade do contato</span>
                  <span className="block text-xs text-gray-500">
                    Fecha automaticamente o atendimento se o contato ficar inativo.
                  </span>
                </span>
              </label>

              <div className="pl-7 max-w-xs">
                <input
                  type="number"
                  min={1}
                  value={formSettings.inactive_close_minutes ?? ""}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      inactive_close_minutes: e.target.value ? Number(e.target.value) : null
                    }))
                  }
                  disabled={!canManage || !formSettings.auto_close_inactive_enabled}
                  className="w-full h-10 px-3 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
                  placeholder="Minutos (ex: 30)"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-gray-500">Altere as preferencias e clique em salvar.</div>
              <button
                type="button"
                onClick={saveSettings}
                disabled={!canManage || saving}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm hover:bg-black transition disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar configuracoes"}
              </button>
            </div>
          </>
        )}
      </div>

      {selectedConnectionId && canManage ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Operadores da fila</h2>
            <p className="text-xs text-gray-500 mt-1">
              Ative apenas usuarios que devem participar da distribuicao automatica nesta conexao.
            </p>
          </div>

          {loadingQueueAgents ? (
            <div className="text-sm text-gray-500">Carregando usuarios...</div>
          ) : queueAgents.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhum usuario encontrado.</div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium text-gray-600">Usuário</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Role</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Fila</th>
                  </tr>
                </thead>
                <tbody>
                  {queueAgents.map((agent) => (
                    <tr key={agent.id} className="border-t">
                      <td className="px-3 py-2 text-gray-800">{agent.email || agent.id}</td>
                      <td className="px-3 py-2 text-gray-600">{agent.role || "Sem role"}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleQueueAgent(agent)}
                          disabled={updatingAgentId === agent.id}
                          className={[
                            "px-3 py-1 rounded-full border text-xs font-medium transition disabled:opacity-60",
                            agent.isActiveInQueue
                              ? "bg-green-50 text-green-700 border-green-300"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          ].join(" ")}
                        >
                          {updatingAgentId === agent.id
                            ? "Atualizando..."
                            : agent.isActiveInQueue
                              ? "Ativo"
                              : "Inativo"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {selectedConnectionId && canManage ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Logs de distribuição</h2>
              <p className="text-xs text-gray-500 mt-1">Últimos eventos da distribuição automática.</p>
            </div>
            <button
              type="button"
              onClick={() => loadDistributionLogs(selectedConnectionId)}
              className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
            >
              Atualizar
            </button>
          </div>

          {loadingDistributionLogs ? (
            <div className="text-sm text-gray-500">Carregando logs...</div>
          ) : distributionLogs.length === 0 ? (
            <div className="text-sm text-gray-500">Sem logs para essa conexão ainda.</div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium text-gray-600">Quando</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Contato</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Role</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Operador</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {distributionLogs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatLogDate(log.created_at)}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {log.conversation_contact_name || log.conversation_wa_id || log.conversation_id || "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{log.department || "-"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={[
                            "px-2 py-0.5 rounded-full border",
                            log.status === "assigned"
                              ? "bg-green-50 text-green-700 border-green-300"
                              : log.status === "error"
                                ? "bg-red-50 text-red-700 border-red-300"
                                : "bg-amber-50 text-amber-700 border-amber-300"
                          ].join(" ")}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{log.selected_user_email || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{log.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
