"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import "@xyflow/react/dist/style.css"
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type OnConnect,
  type OnSelectionChangeFunc
} from "@xyflow/react"

type MetaConnection = {
  id: string
  display_phone_number?: string | null
  verified_name?: string | null
}

type FlowNodeData = {
  kind?: "start" | "message" | "question" | "condition" | "action" | "end"
  title?: string
  message?: string
  options?: string[]
  questionMode?: "text" | "buttons"
  messageType?: "text" | "image" | "video" | "document"
  mediaLink?: string
  fileName?: string
  actionType?: "tag" | "route" | "handoff" | "note"
  actionValue?: string
}

type FlowEdgeData = {
  rule?: string
  priority?: number
  default?: boolean
}

const DEFAULT_NODES: Node<FlowNodeData>[] = [
  {
    id: "start-1",
    type: "default",
    position: { x: 80, y: 80 },
    data: { kind: "start", title: "Início", message: "Olá! Vou te ajudar com o atendimento." }
  }
]

const DEFAULT_EDGES: Edge<FlowEdgeData>[] = []

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function cleanNodeLabel(node: Node<FlowNodeData>) {
  const title = (node.data?.title || node.type || "node").trim()
  return title || "node"
}

export default function MetaChatbotBuilderPage() {
  const [connections, setConnections] = useState<MetaConnection[]>([])
  const [departmentRoles, setDepartmentRoles] = useState<string[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState("")
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>(DEFAULT_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<FlowEdgeData>>(DEFAULT_EDGES)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [statusText, setStatusText] = useState("")

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId]
  )

  const fetchConnections = useCallback(async () => {
    const res = await fetch("/api/meta/embedded-signup/connections", { cache: "no-store" })
    if (!res.ok) return
    const payload = await res.json()
    const list: MetaConnection[] = payload?.data ?? []
    setConnections(list)
    if (!selectedConnectionId && list.length > 0) {
      setSelectedConnectionId(list[0].id)
    }
  }, [selectedConnectionId])

  const fetchDepartmentRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" })
      if (!res.ok) return

      const users = await res.json()
      const list = Array.isArray(users) ? users : []

      const roles = Array.from(
        new Set(
          list
            .map((item) => String(item?.role || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b))

      setDepartmentRoles(roles)
    } catch {
      setDepartmentRoles([])
    }
  }, [])

  const loadFlow = useCallback(
    async (connectionId: string) => {
      if (!connectionId) return
      try {
        setLoading(true)
        setStatusText("")
        const res = await fetch(`/api/meta/chatbot/flows?connectionId=${encodeURIComponent(connectionId)}`, {
          cache: "no-store"
        })

        if (!res.ok) {
          setStatusText("Não foi possível carregar o fluxo.")
          return
        }

        const payload = await res.json()
        const draft = payload?.data?.draftFlow
        const loadedNodes = Array.isArray(draft?.nodes) && draft.nodes.length > 0 ? draft.nodes : DEFAULT_NODES
        const loadedEdges = Array.isArray(draft?.edges) ? draft.edges : DEFAULT_EDGES
        setNodes(loadedNodes)
        setEdges(loadedEdges)
      } finally {
        setLoading(false)
      }
    },
    [setEdges, setNodes]
  )

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  useEffect(() => {
    fetchDepartmentRoles()
  }, [fetchDepartmentRoles])

  useEffect(() => {
    if (selectedConnectionId) {
      loadFlow(selectedConnectionId)
    }
  }, [selectedConnectionId, loadFlow])

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: uid("edge"),
            label: ""
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onSelectionChange = useCallback<OnSelectionChangeFunc>(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      setSelectedNodeId(selectedNodes[0]?.id ?? null)
      setSelectedEdgeId(selectedEdges[0]?.id ?? null)
    },
    []
  )

  const addNode = (kind: "message" | "question" | "condition" | "action" | "end") => {
    const newNode: Node<FlowNodeData> = {
      id: uid(kind),
      type: "default",
      position: { x: 160 + Math.random() * 320, y: 120 + Math.random() * 280 },
      data: {
        kind,
        title:
          kind === "message"
            ? "Mensagem"
            : kind === "question"
              ? "Pergunta"
              : kind === "condition"
                ? "Condição"
                : kind === "action"
                  ? "Ação"
                  : "Fim",
        message: kind === "question" ? "Qual opção você procura?" : ""
      }
    }

    setNodes((prev) => [...prev, newNode])
    setSelectedNodeId(newNode.id)
    setSelectedEdgeId(null)
  }

  const updateNode = (nodeId: string, updater: (current: Node<FlowNodeData>) => Node<FlowNodeData>) => {
    setNodes((prev) => prev.map((node) => (node.id === nodeId ? updater(node) : node)))
  }

  const updateEdge = (edgeId: string, updater: (current: Edge) => Edge) => {
    setEdges((prev) => prev.map((edge) => (edge.id === edgeId ? updater(edge) : edge)))
  }

  const removeSelected = () => {
    if (selectedEdgeId) {
      setEdges((prev) => prev.filter((edge) => edge.id !== selectedEdgeId))
      setSelectedEdgeId(null)
      return
    }

    if (selectedNodeId) {
      setNodes((prev) => prev.filter((node) => node.id !== selectedNodeId))
      setEdges((prev) => prev.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
      setSelectedNodeId(null)
    }
  }

  const saveDraft = async () => {
    if (!selectedConnectionId || saving) return
    try {
      setSaving(true)
      setStatusText("")
      const payload = {
        connectionId: selectedConnectionId,
        flow: { nodes, edges }
      }

      const res = await fetch("/api/meta/chatbot/flows", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setStatusText(`Erro ao salvar draft: ${json?.error || "desconhecido"}`)
        return
      }

      setStatusText("Draft salvo com sucesso.")
    } finally {
      setSaving(false)
    }
  }

  const publishFlow = async () => {
    if (!selectedConnectionId || publishing) return
    try {
      setPublishing(true)
      setStatusText("")

      const res = await fetch("/api/meta/chatbot/flows/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: selectedConnectionId })
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setStatusText(`Erro ao publicar: ${json?.error || "desconhecido"}`)
        return
      }

      setStatusText("Fluxo publicado.")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full grid grid-cols-12 bg-[#f7f8fa]">
      <div className="col-span-3 border-r bg-white p-4 space-y-4 overflow-y-auto">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Chatbot Meta</h1>
          <p className="text-xs text-gray-500 mt-1">
            Editor visual estilo Node-RED para perguntas e roteamento.
          </p>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-2">Conexão Meta</label>
          <select
            value={selectedConnectionId}
            onChange={(e) => setSelectedConnectionId(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 bg-gray-50"
          >
            <option value="">Selecione</option>
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.display_phone_number || conn.verified_name || conn.id}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-gray-500">Adicionar nó</div>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50" onClick={() => addNode("message")}>
              Mensagem
            </button>
            <button className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50" onClick={() => addNode("question")}>
              Pergunta
            </button>
            <button className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50" onClick={() => addNode("condition")}>
              Condição
            </button>
            <button className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50" onClick={() => addNode("action")}>
              Ação
            </button>
            <button className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 col-span-2" onClick={() => addNode("end")}>
              Fim
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <button
            className="w-full px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60"
            onClick={saveDraft}
            disabled={!selectedConnectionId || saving}
          >
            {saving ? "Salvando..." : "Salvar Draft"}
          </button>

          <button
            className="w-full px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            onClick={publishFlow}
            disabled={!selectedConnectionId || publishing}
          >
            {publishing ? "Publicando..." : "Publicar Fluxo"}
          </button>

          <button
            className="w-full px-3 py-2 rounded-xl border hover:bg-gray-50 disabled:opacity-60"
            onClick={removeSelected}
            disabled={!selectedNodeId && !selectedEdgeId}
          >
            Remover Selecionado
          </button>
        </div>

        {statusText && (
          <div className="text-xs rounded-lg border px-3 py-2 bg-gray-50 text-gray-700">
            {statusText}
          </div>
        )}

        {selectedNode && (
          <div className="space-y-2 border-t pt-4">
            <div className="text-xs font-semibold text-gray-700">Nó selecionado</div>
            <div className="text-[11px] text-gray-500">ID: {selectedNode.id}</div>

            <input
              value={selectedNode.data?.title || ""}
              onChange={(e) =>
                updateNode(selectedNode.id, (node) => ({
                  ...node,
                  data: { ...node.data, title: e.target.value }
                }))
              }
              placeholder="Título"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />

            <textarea
              value={selectedNode.data?.message || ""}
              onChange={(e) =>
                updateNode(selectedNode.id, (node) => ({
                  ...node,
                  data: { ...node.data, message: e.target.value }
                }))
              }
              placeholder="Mensagem"
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[88px]"
            />

            <textarea
              value={(selectedNode.data?.options || []).join("\n")}
              onChange={(e) =>
                updateNode(selectedNode.id, (node) => ({
                  ...node,
                  data: {
                    ...node.data,
                    options: e.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  }
                }))
              }
              placeholder="Opções da pergunta (uma por linha)"
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[88px]"
            />

            <select
              value={selectedNode.data?.questionMode || "text"}
              onChange={(e) =>
                updateNode(selectedNode.id, (node) => ({
                  ...node,
                  data: {
                    ...node.data,
                    questionMode: e.target.value as FlowNodeData["questionMode"]
                  }
                }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="text">Pergunta: resposta por texto</option>
              <option value="buttons">Pergunta: menu clicável (até 3 opções)</option>
            </select>

            <select
              value={selectedNode.data?.messageType || "text"}
              onChange={(e) =>
                updateNode(selectedNode.id, (node) => ({
                  ...node,
                  data: {
                    ...node.data,
                    messageType: e.target.value as FlowNodeData["messageType"]
                  }
                }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="text">Conteúdo: Texto</option>
              <option value="image">Conteúdo: Imagem (link)</option>
              <option value="video">Conteúdo: Vídeo (link)</option>
              <option value="document">Conteúdo: Arquivo (link)</option>
            </select>

            {(selectedNode.data?.messageType || "text") !== "text" && (
              <>
                <input
                  value={selectedNode.data?.mediaLink || ""}
                  onChange={(e) =>
                    updateNode(selectedNode.id, (node) => ({
                      ...node,
                      data: { ...node.data, mediaLink: e.target.value }
                    }))
                  }
                  placeholder="Link público da mídia (https://...)"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />

                {(selectedNode.data?.messageType || "text") === "document" && (
                  <input
                    value={selectedNode.data?.fileName || ""}
                    onChange={(e) =>
                      updateNode(selectedNode.id, (node) => ({
                        ...node,
                        data: { ...node.data, fileName: e.target.value }
                      }))
                    }
                    placeholder="Nome do arquivo (opcional)"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                )}
              </>
            )}

            <select
              value={selectedNode.data?.actionType || "route"}
              onChange={(e) =>
                updateNode(selectedNode.id, (node) => ({
                  ...node,
                  data: { ...node.data, actionType: e.target.value as FlowNodeData["actionType"] }
                }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="route">Ação: Rota</option>
              <option value="tag">Ação: Tag</option>
              <option value="handoff">Ação: Handoff</option>
              <option value="note">Ação: Nota</option>
            </select>

            {(selectedNode.data?.actionType || "route") === "route" ? (
              <select
                value={selectedNode.data?.actionValue || ""}
                onChange={(e) =>
                  updateNode(selectedNode.id, (node) => ({
                    ...node,
                    data: { ...node.data, actionValue: e.target.value }
                  }))
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione o setor (role)</option>
                {departmentRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={selectedNode.data?.actionValue || ""}
                onChange={(e) =>
                  updateNode(selectedNode.id, (node) => ({
                    ...node,
                    data: { ...node.data, actionValue: e.target.value }
                  }))
                }
                placeholder="Valor da ação"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>
        )}

        {selectedEdge && (
          <div className="space-y-2 border-t pt-4">
            <div className="text-xs font-semibold text-gray-700">Conexão selecionada</div>
            <div className="text-[11px] text-gray-500">
              {selectedEdge.source} {"->"} {selectedEdge.target}
            </div>

            <input
              value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
              onChange={(e) =>
                updateEdge(selectedEdge.id, (edge) => ({
                  ...edge,
                  label: e.target.value
                }))
              }
              placeholder="Rótulo visual (ex.: Comercial)"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />

            <input
              value={selectedEdge.data?.rule || ""}
              onChange={(e) =>
                updateEdge(selectedEdge.id, (edge) => ({
                  ...edge,
                  data: { ...(edge.data || {}), rule: e.target.value }
                }))
              }
              placeholder="Regra (ex.: comercial|vendas)"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />

            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={Boolean(selectedEdge.data?.default)}
                onChange={(e) =>
                  updateEdge(selectedEdge.id, (edge) => ({
                    ...edge,
                    data: { ...(edge.data || {}), default: e.target.checked }
                  }))
                }
              />
              Caminho padrão
            </label>
          </div>
        )}
      </div>

      <div className="col-span-9">
        <div className="h-full w-full">
          <ReactFlow
            nodes={nodes.map((node) => ({
              ...node,
              data: { ...node.data, label: cleanNodeLabel(node) }
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </div>
      {loading && (
        <div className="fixed bottom-4 right-4 bg-black text-white text-xs px-3 py-2 rounded-lg shadow">
          Carregando fluxo...
        </div>
      )}
    </div>
  )
}


