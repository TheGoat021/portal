"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, RefreshCcw, Save } from "lucide-react"
import { VoiceAgent, VoiceQueue } from "@/lib/voice/types"

type QueueFormMemberState = {
  selected: boolean
  priority: string
}

type QueueFormState = {
  name: string
  slug: string
  description: string
  inboundNumber: string
  greetingAudioUrl: string
  greetingAudioName: string
  strategy: string
  maxWaitSeconds: string
  active: boolean
  members: Record<string, QueueFormMemberState>
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildMemberState(agents: VoiceAgent[], queue?: VoiceQueue | null) {
  const assignedMembers = new Map(
    (queue?.members ?? []).map((member) => [member.agent_id, member])
  )

  return Object.fromEntries(
    agents.map((agent) => {
      const existing = assignedMembers.get(agent.id)
      return [
        agent.id,
        {
          selected: Boolean(existing?.active),
          priority: String(existing?.priority ?? 1)
        }
      ]
    })
  )
}

function buildFormState(agents: VoiceAgent[], queue?: VoiceQueue | null): QueueFormState {
  return {
    name: queue?.name || "",
    slug: queue?.slug || "",
    description: queue?.description || "",
    inboundNumber: queue?.inbound_number || "",
    greetingAudioUrl: queue?.greeting_audio_url || "",
    greetingAudioName: queue?.greeting_audio_name || "",
    strategy: queue?.strategy || "ringall",
    maxWaitSeconds: String(queue?.max_wait_seconds ?? 300),
    active: queue?.active ?? true,
    members: buildMemberState(agents, queue)
  }
}

function extractSelectedMembers(state: QueueFormState) {
  return Object.entries(state.members)
    .filter(([, member]) => member.selected)
    .map(([agentId, member]) => ({
      agentId,
      priority: Number(member.priority || "1"),
      active: true
    }))
}

async function uploadGreetingAudio(queueSlug: string, file: File) {
  const formData = new FormData()
  formData.set("queueSlug", slugify(queueSlug) || "fila")
  formData.set("file", file)

  const response = await fetch("/api/voice/queues/upload", {
    method: "POST",
    body: formData
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || "Nao foi possivel subir o audio inicial da fila.")
  }

  return (await response.json()) as {
    publicUrl: string
    fileName: string
  }
}

export default function QueueAdminPanel({
  queues,
  agents,
  loading,
  saving,
  errorMessage,
  onReload,
  onCreate,
  onUpdate
}: {
  queues: VoiceQueue[]
  agents: VoiceAgent[]
  loading: boolean
  saving: boolean
  errorMessage: string | null
  onReload: () => Promise<void> | void
  onCreate: (input: {
    name: string
    slug?: string
    description?: string | null
    inboundNumber?: string | null
    greetingAudioUrl?: string | null
    greetingAudioName?: string | null
    strategy: string
    maxWaitSeconds: number
    active: boolean
    members: Array<{
      agentId: string
      priority: number
      active: boolean
    }>
  }) => Promise<void>
  onUpdate: (
    queueId: string,
    input: {
      name: string
      slug?: string
      description?: string | null
      inboundNumber?: string | null
      greetingAudioUrl?: string | null
      greetingAudioName?: string | null
      strategy: string
      maxWaitSeconds: number
      active: boolean
      members: Array<{
        agentId: string
        priority: number
        active: boolean
      }>
    }
  ) => Promise<void>
}) {
  const sortedQueues = useMemo(
    () => [...queues].sort((left, right) => left.name.localeCompare(right.name)),
    [queues]
  )
  const sortedAgents = useMemo(
    () => [...agents].sort((left, right) => left.name.localeCompare(right.name)),
    [agents]
  )

  const [createState, setCreateState] = useState<QueueFormState>(buildFormState(sortedAgents))
  const [createAudioFile, setCreateAudioFile] = useState<File | null>(null)
  const [savingCreate, setSavingCreate] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null)
  const [editState, setEditState] = useState<QueueFormState>(buildFormState(sortedAgents))
  const [editAudioFile, setEditAudioFile] = useState<File | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    setCreateState((current) => ({
      ...current,
      members: {
        ...buildMemberState(sortedAgents),
        ...current.members
      }
    }))
  }, [sortedAgents])

  const updateMemberState = (
    type: "create" | "edit",
    agentId: string,
    patch: Partial<QueueFormMemberState>
  ) => {
    const setter = type === "create" ? setCreateState : setEditState
    setter((current) => ({
      ...current,
      members: {
        ...current.members,
        [agentId]: {
          ...(current.members[agentId] || { selected: false, priority: "1" }),
          ...patch
        }
      }
    }))
  }

  const handleCreate = async () => {
    if (!createState.name.trim()) return

    setSavingCreate(true)
    setCreateError(null)

    try {
      let greetingAudioUrl = createState.greetingAudioUrl || null
      let greetingAudioName = createState.greetingAudioName || null

      if (createAudioFile) {
        const uploaded = await uploadGreetingAudio(
          createState.slug || createState.name,
          createAudioFile
        )
        greetingAudioUrl = uploaded.publicUrl
        greetingAudioName = uploaded.fileName
      }

      await onCreate({
        name: createState.name.trim(),
        slug: slugify(createState.slug || createState.name),
        description: createState.description.trim() || null,
        inboundNumber: createState.inboundNumber.trim() || null,
        greetingAudioUrl,
        greetingAudioName,
        strategy: createState.strategy,
        maxWaitSeconds: Number(createState.maxWaitSeconds || "300"),
        active: createState.active,
        members: extractSelectedMembers(createState)
      })
      setCreateState(buildFormState(sortedAgents))
      setCreateAudioFile(null)
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Nao foi possivel criar a fila."
      )
    } finally {
      setSavingCreate(false)
    }
  }

  const startEditing = (queue: VoiceQueue) => {
    setEditingQueueId(queue.id)
    setEditState(buildFormState(sortedAgents, queue))
    setEditAudioFile(null)
    setEditError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingQueueId || !editState.name.trim()) return

    setEditError(null)
    try {
      let greetingAudioUrl = editState.greetingAudioUrl || null
      let greetingAudioName = editState.greetingAudioName || null

      if (editAudioFile) {
        const uploaded = await uploadGreetingAudio(editState.slug || editState.name, editAudioFile)
        greetingAudioUrl = uploaded.publicUrl
        greetingAudioName = uploaded.fileName
      }

      await onUpdate(editingQueueId, {
        name: editState.name.trim(),
        slug: slugify(editState.slug || editState.name),
        description: editState.description.trim() || null,
        inboundNumber: editState.inboundNumber.trim() || null,
        greetingAudioUrl,
        greetingAudioName,
        strategy: editState.strategy,
        maxWaitSeconds: Number(editState.maxWaitSeconds || "300"),
        active: editState.active,
        members: extractSelectedMembers(editState)
      })
      setEditingQueueId(null)
      setEditAudioFile(null)
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Nao foi possivel atualizar a fila."
      )
    }
  }

  const renderMembers = (type: "create" | "edit", state: QueueFormState) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Membros da fila
      </p>
      <div className="mt-3 grid gap-2">
        {sortedAgents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            Nenhum ramal provisionado ainda para associar nesta fila.
          </div>
        ) : (
          sortedAgents.map((agent) => {
            const memberState = state.members[agent.id] || {
              selected: false,
              priority: "1"
            }

            return (
              <div
                key={agent.id}
                className="grid gap-2 rounded-xl border border-slate-200 px-3 py-2 md:grid-cols-[minmax(0,1fr)_110px]"
              >
                <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={memberState.selected}
                    onChange={(event) =>
                      updateMemberState(type, agent.id, {
                        selected: event.target.checked
                      })
                    }
                  />
                  <span>
                    {agent.name} <span className="text-slate-400">({agent.extension})</span>
                  </span>
                </label>
                <input
                  value={memberState.priority}
                  onChange={(event) =>
                    updateMemberState(type, agent.id, {
                      priority: event.target.value.replace(/\D/g, "")
                    })
                  }
                  placeholder="Prioridade"
                  disabled={!memberState.selected}
                  className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-slate-900 outline-none disabled:bg-slate-50"
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Administracao de filas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Defina nome, numero dono da fila, estrategia e quais ramais pertencem a cada departamento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onReload()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_170px_170px_150px_140px_auto]">
          <input
            value={createState.name}
            onChange={(event) =>
              setCreateState((current) => ({
                ...current,
                name: event.target.value,
                slug: current.slug || slugify(event.target.value)
              }))
            }
            placeholder="Nome da fila"
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
          <input
            value={createState.slug}
            onChange={(event) =>
              setCreateState((current) => ({
                ...current,
                slug: slugify(event.target.value)
              }))
            }
            placeholder="Slug"
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
          <input
            value={createState.inboundNumber}
            onChange={(event) =>
              setCreateState((current) => ({
                ...current,
                inboundNumber: event.target.value.replace(/\D/g, "")
              }))
            }
            placeholder="Numero da fila"
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
          <select
            value={createState.strategy}
            onChange={(event) =>
              setCreateState((current) => ({
                ...current,
                strategy: event.target.value
              }))
            }
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="ringall">ringall</option>
            <option value="rrmemory">rrmemory</option>
            <option value="leastrecent">leastrecent</option>
            <option value="fewestcalls">fewestcalls</option>
          </select>
          <input
            value={createState.maxWaitSeconds}
            onChange={(event) =>
              setCreateState((current) => ({
                ...current,
                maxWaitSeconds: event.target.value.replace(/\D/g, "")
              }))
            }
            placeholder="Timeout"
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!createState.name.trim() || savingCreate || saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Plus className="h-4 w-4" />
            {savingCreate ? "Criando..." : "Criar fila"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <input
            value={createState.description}
            onChange={(event) =>
              setCreateState((current) => ({
                ...current,
                description: event.target.value
              }))
            }
            placeholder="Descricao opcional"
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
          <label className="inline-flex h-11 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={createState.active}
              onChange={(event) =>
                setCreateState((current) => ({
                  ...current,
                  active: event.target.checked
                }))
              }
            />
            Criar fila ativa
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex min-h-11 cursor-pointer items-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-sm text-slate-600">
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null
                setCreateAudioFile(nextFile)
                if (nextFile) {
                  setCreateState((current) => ({
                    ...current,
                    greetingAudioName: nextFile.name
                  }))
                }
              }}
            />
            {createAudioFile
              ? `Audio selecionado: ${createAudioFile.name}`
              : createState.greetingAudioName
                ? `Audio atual: ${createState.greetingAudioName}`
                : "Selecionar audio inicial da fila"}
          </label>
          {(createAudioFile || createState.greetingAudioUrl) ? (
            <button
              type="button"
              onClick={() => {
                setCreateAudioFile(null)
                setCreateState((current) => ({
                  ...current,
                  greetingAudioUrl: "",
                  greetingAudioName: ""
                }))
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Remover audio
            </button>
          ) : null}
        </div>

        <div className="mt-3">{renderMembers("create", createState)}</div>

        {createError ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {createError}
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Carregando filas configuradas...
          </div>
        ) : sortedQueues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Nenhuma fila cadastrada ainda.
          </div>
        ) : (
          sortedQueues.map((queue) => {
            const isEditing = editingQueueId === queue.id
            const state = isEditing ? editState : buildFormState(sortedAgents, queue)

            return (
              <div
                key={queue.id}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.18)]"
              >
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_170px_170px_150px_140px_auto]">
                  <input
                    value={state.name}
                    onChange={(event) =>
                      isEditing &&
                      setEditState((current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                    readOnly={!isEditing}
                    className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none read-only:bg-slate-50"
                  />
                  <input
                    value={state.slug}
                    onChange={(event) =>
                      isEditing &&
                      setEditState((current) => ({
                        ...current,
                        slug: slugify(event.target.value)
                      }))
                    }
                    readOnly={!isEditing}
                    className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none read-only:bg-slate-50"
                  />
                  <input
                    value={state.inboundNumber}
                    onChange={(event) =>
                      isEditing &&
                      setEditState((current) => ({
                        ...current,
                        inboundNumber: event.target.value.replace(/\D/g, "")
                      }))
                    }
                    readOnly={!isEditing}
                    className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none read-only:bg-slate-50"
                  />
                  <select
                    value={state.strategy}
                    onChange={(event) =>
                      isEditing &&
                      setEditState((current) => ({
                        ...current,
                        strategy: event.target.value
                      }))
                    }
                    disabled={!isEditing}
                    className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none disabled:bg-slate-50"
                  >
                    <option value="ringall">ringall</option>
                    <option value="rrmemory">rrmemory</option>
                    <option value="leastrecent">leastrecent</option>
                    <option value="fewestcalls">fewestcalls</option>
                  </select>
                  <input
                    value={state.maxWaitSeconds}
                    onChange={(event) =>
                      isEditing &&
                      setEditState((current) => ({
                        ...current,
                        maxWaitSeconds: event.target.value.replace(/\D/g, "")
                      }))
                    }
                    readOnly={!isEditing}
                    className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none read-only:bg-slate-50"
                  />
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => void handleSaveEdit()}
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      <Save className="h-4 w-4" />
                      Salvar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(queue)}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Editar
                    </button>
                  )}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                  <input
                    value={state.description}
                    onChange={(event) =>
                      isEditing &&
                      setEditState((current) => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                    readOnly={!isEditing}
                    className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-900 outline-none read-only:bg-slate-50"
                  />
                  <label className="inline-flex h-11 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={state.active}
                      onChange={(event) =>
                        isEditing &&
                        setEditState((current) => ({
                          ...current,
                          active: event.target.checked
                        }))
                      }
                      disabled={!isEditing}
                    />
                    Fila ativa
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <label
                    className={`flex min-h-11 items-center rounded-xl border px-4 text-sm ${
                      isEditing
                        ? "cursor-pointer border-dashed border-slate-300 bg-white text-slate-600"
                        : "border-[#E5E7EB] bg-slate-50 text-slate-500"
                    }`}
                  >
                    {isEditing ? (
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null
                          setEditAudioFile(nextFile)
                          if (nextFile) {
                            setEditState((current) => ({
                              ...current,
                              greetingAudioName: nextFile.name
                            }))
                          }
                        }}
                      />
                    ) : null}
                    {editAudioFile && isEditing
                      ? `Novo audio: ${editAudioFile.name}`
                      : state.greetingAudioName
                        ? `Audio atual: ${state.greetingAudioName}`
                        : "Nenhum audio inicial configurado"}
                  </label>
                  {isEditing && (editAudioFile || state.greetingAudioUrl) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditAudioFile(null)
                        setEditState((current) => ({
                          ...current,
                          greetingAudioUrl: "",
                          greetingAudioName: ""
                        }))
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Remover audio
                    </button>
                  ) : null}
                </div>

                {isEditing ? <div className="mt-3">{renderMembers("edit", editState)}</div> : null}
              </div>
            )
          })
        )}
      </div>

      {editError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {editError}
        </div>
      ) : null}
    </section>
  )
}
