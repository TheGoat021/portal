"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, RefreshCcw } from "lucide-react"
import { VoiceProvisionUser } from "@/lib/voice/api"

function buildDefaultExtension(email?: string | null) {
  const digits = (email || "").replace(/\D/g, "").slice(-4)
  if (digits.length >= 3) return digits.padStart(4, "1")
  return ""
}

export default function AgentProvisionPanel({
  users,
  loading,
  errorMessage,
  warningMessage,
  onProvision,
  onReload
}: {
  users: VoiceProvisionUser[]
  loading: boolean
  errorMessage: string | null
  warningMessage?: string | null
  onProvision: (input: { userId: string; extension: string }) => Promise<void>
  onReload: () => Promise<void> | void
}) {
  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => (left.email || "").localeCompare(right.email || "")),
    [users]
  )

  const [selectedUserId, setSelectedUserId] = useState("")
  const [extension, setExtension] = useState("")
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const selectedUser = useMemo(
    () => sortedUsers.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, sortedUsers]
  )

  useEffect(() => {
    if (!selectedUserId && sortedUsers.length > 0) {
      setSelectedUserId(sortedUsers[0].id)
      setExtension(buildDefaultExtension(sortedUsers[0].email))
    }
  }, [selectedUserId, sortedUsers])

  useEffect(() => {
    if (selectedUser) {
      setExtension((current) => current || buildDefaultExtension(selectedUser.email))
    }
  }, [selectedUser])

  const handleProvision = async () => {
    if (!selectedUserId || !extension.trim()) return

    setSaving(true)
    setSubmitError(null)
    try {
      await onProvision({
        userId: selectedUserId,
        extension: extension.trim()
      })

      const remainingUsers = sortedUsers.filter((user) => user.id !== selectedUserId)
      const nextUser = remainingUsers[0] ?? null
      setSelectedUserId(nextUser?.id ?? "")
      setExtension(nextUser ? buildDefaultExtension(nextUser.email) : "")
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar o ramal agora."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_36px_-28px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">Provisionar usuarios do Axion</p>
          <p className="mt-1 text-sm text-slate-500">
            Selecione o usuario, defina o ramal e crie o vinculo para o softphone reconhecer login e extensao automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onReload()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Atualizar lista
        </button>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {submitError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}

      {warningMessage ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warningMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Carregando usuarios disponiveis para ramal...
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-6 text-sm text-emerald-700">
          Todos os usuarios elegiveis ja possuem ramal provisionado no Axion Voice.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_auto]">
          <select
            value={selectedUserId}
            onChange={(event) => {
              const nextUser = sortedUsers.find((user) => user.id === event.target.value) ?? null
              setSelectedUserId(event.target.value)
              setExtension(buildDefaultExtension(nextUser?.email))
            }}
            className="h-12 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            {sortedUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email || "Usuario sem email"}
              </option>
            ))}
          </select>

          <input
            value={extension}
            onChange={(event) => setExtension(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Ramal"
            className="h-12 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400"
          />

          <button
            type="button"
            onClick={() => void handleProvision()}
            disabled={!selectedUserId || !extension.trim() || saving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Criando..." : "Criar ramal"}
          </button>
        </div>
      )}
    </section>
  )
}
