import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getMetaConnectionById, insertMetaMessage, touchMetaConversation } from "@/lib/metaDb"
import { upsertMetaConversationManagement } from "@/lib/metaConversationManagement"
import { tryAutoAssignConversation } from "@/lib/metaQueueDistribution"
import { normalizePhone, sendTextMessage } from "@/lib/whatsappMeta"

export type ChatbotNodeType = "start" | "message" | "question" | "condition" | "action" | "end"

export type ChatbotNode = {
  id: string
  type: ChatbotNodeType
  position?: { x: number; y: number }
  data?: {
    kind?: ChatbotNodeType
    title?: string
    message?: string
    options?: string[]
    actionType?: "tag" | "route" | "handoff" | "note"
    actionValue?: string
  }
}

export type ChatbotEdge = {
  id: string
  source: string
  target: string
  label?: string
  data?: {
    rule?: string
    priority?: number
    default?: boolean
  }
}

export type ChatbotFlow = {
  nodes: ChatbotNode[]
  edges: ChatbotEdge[]
}

type ChatbotSession = {
  id: string
  connection_id: string
  conversation_id: string
  current_node_id: string | null
  state: "active" | "completed" | "disabled"
  context: Record<string, unknown> | null
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function getOutgoingEdges(flow: ChatbotFlow, nodeId: string) {
  return flow.edges
    .filter((edge) => edge.source === nodeId)
    .sort((a, b) => (a.data?.priority ?? 0) - (b.data?.priority ?? 0))
}

function getNode(flow: ChatbotFlow, nodeId: string | null | undefined) {
  if (!nodeId) return null
  return flow.nodes.find((node) => node.id === nodeId) ?? null
}

function resolveNodeKind(node: ChatbotNode): ChatbotNodeType {
  const byDataKind = node.data?.kind
  if (byDataKind && ["start", "message", "question", "condition", "action", "end"].includes(byDataKind)) {
    return byDataKind
  }

  const byType = node.type
  if (["start", "message", "question", "condition", "action", "end"].includes(byType)) {
    return byType as ChatbotNodeType
  }

  const nodeId = (node.id || "").toLowerCase()
  if (nodeId.startsWith("start-")) return "start"
  if (nodeId.startsWith("message-")) return "message"
  if (nodeId.startsWith("question-")) return "question"
  if (nodeId.startsWith("condition-")) return "condition"
  if (nodeId.startsWith("action-")) return "action"
  if (nodeId.startsWith("end-")) return "end"

  const title = normalizeText(node.data?.title || "")
  if (title === "inicio" || title === "início") return "start"
  if (title === "mensagem") return "message"
  if (title === "pergunta") return "question"
  if (title === "condicao" || title === "condição") return "condition"
  if (title === "acao" || title === "ação") return "action"
  if (title === "fim") return "end"

  return "message"
}

function buildQuestionText(message: string, options: string[]) {
  if (options.length === 0) return message

  const numbered = options
    .map((option, index) => `${index + 1}. ${option}`)
    .join("\n")

  return `${message}\n\n${numbered}`
}

function pickStartNode(flow: ChatbotFlow) {
  return flow.nodes.find((node) => resolveNodeKind(node) === "start") ?? flow.nodes[0] ?? null
}

function matchQuestionOption(options: string[], inboundText: string) {
  const normalizedInput = normalizeText(inboundText)
  if (!normalizedInput) return null

  const asNumber = Number.parseInt(normalizedInput, 10)
  if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= options.length) {
    return options[asNumber - 1]
  }

  const exact = options.find((option) => normalizeText(option) === normalizedInput)
  if (exact) return exact

  const contains = options.find((option) => normalizedInput.includes(normalizeText(option)))
  if (contains) return contains

  return null
}

function pickEdgeByRule(edges: ChatbotEdge[], ruleValue: string) {
  const normalizedRuleValue = normalizeText(ruleValue)
  for (const edge of edges) {
    const edgeRule = edge.data?.rule || edge.label || ""
    if (!edgeRule) continue

    const tokens = edgeRule
      .split("|")
      .map((token) => normalizeText(token))
      .filter(Boolean)

    if (tokens.some((token) => normalizedRuleValue.includes(token))) {
      return edge
    }
  }

  return edges.find((edge) => edge.data?.default || !edge.data?.rule) ?? edges[0] ?? null
}

async function sendBotMessage({
  connectionId,
  conversationId,
  to,
  text
}: {
  connectionId: string
  conversationId: string
  to: string
  text: string
}) {
  const connection = await getMetaConnectionById(connectionId)
  if (!connection?.phone_number_id || !connection?.business_token) {
    throw new Error("Conexão Meta inválida para envio do chatbot")
  }

  const normalizedTo = normalizePhone(to)
  if (!normalizedTo) return

  const response = await sendTextMessage({
    phoneNumberId: connection.phone_number_id,
    token: connection.business_token,
    to: normalizedTo,
    text
  })

  const metaMessageId = response?.messages?.[0]?.id ?? null

  await insertMetaMessage({
    conversationId,
    connectionId: connection.id,
    companyId: connection.company_id,
    metaMessageId,
    direction: "outbound",
    status: "sent",
    fromPhone: connection.display_phone_number || null,
    toPhone: normalizedTo,
    type: "text",
    message: text,
    rawPayload: response
  })

  await touchMetaConversation({
    conversationId,
    lastMessage: text,
    lastMessageType: "text"
  })
}

async function getAvailableFlow(connectionId: string): Promise<ChatbotFlow | null> {
  const { data, error } = await supabaseAdmin
    .from("meta_chatbot_flows")
    .select("published_flow, draft_flow")
    .eq("connection_id", connectionId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const publishedFlow = data?.published_flow as ChatbotFlow | null | undefined
  const draftFlow = data?.draft_flow as ChatbotFlow | null | undefined

  const flow =
    publishedFlow?.nodes?.length
      ? publishedFlow
      : draftFlow?.nodes?.length
        ? draftFlow
        : null

  if (!flow) return null

  return {
    nodes: Array.isArray(flow.nodes) ? flow.nodes : [],
    edges: Array.isArray(flow.edges) ? flow.edges : []
  }
}

async function getOrCreateSession({
  connectionId,
  conversationId
}: {
  connectionId: string
  conversationId: string
}): Promise<ChatbotSession> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("meta_chatbot_sessions")
    .select("*")
    .eq("connection_id", connectionId)
    .eq("conversation_id", conversationId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing) return existing as ChatbotSession

  const { data: created, error: createError } = await supabaseAdmin
    .from("meta_chatbot_sessions")
    .insert({
      connection_id: connectionId,
      conversation_id: conversationId,
      state: "active",
      current_node_id: null,
      context: {}
    })
    .select("*")
    .single()

  if (createError) throw new Error(createError.message)
  return created as ChatbotSession
}

async function updateSession(
  sessionId: string,
  payload: Partial<Pick<ChatbotSession, "current_node_id" | "state" | "context">>
) {
  const { error } = await supabaseAdmin
    .from("meta_chatbot_sessions")
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq("id", sessionId)

  if (error) throw new Error(error.message)
}

export async function runMetaChatbotForInbound({
  connectionId,
  conversationId,
  to,
  inboundText,
  restartSession = false
}: {
  connectionId: string
  conversationId: string
  to: string
  inboundText: string
  restartSession?: boolean
}) {
  const flow = await getAvailableFlow(connectionId)
  if (!flow) return

  let session = await getOrCreateSession({ connectionId, conversationId })
  if (session.state === "disabled") return

  if (session.state === "completed") {
    if (!restartSession) return

    await updateSession(session.id, {
      state: "active",
      current_node_id: null,
      context: {}
    })

    session = {
      ...session,
      state: "active",
      current_node_id: null,
      context: {}
    }
  }

  const isFirstInboundForSession = !session.current_node_id
  let currentNodeId = session.current_node_id
  if (!currentNodeId) {
    const startNode = pickStartNode(flow)
    currentNodeId = startNode?.id ?? null
  }

  if (!currentNodeId) return

  let node = getNode(flow, currentNodeId)
  if (!node) return

  let remainingInput = isFirstInboundForSession ? "" : inboundText || ""
  let context = { ...(session.context ?? {}) }

  const maxSteps = 12

  for (let step = 0; step < maxSteps; step += 1) {
    if (!node) break

    const outgoing = getOutgoingEdges(flow, node.id)
    const message = (node.data?.message || "").trim()
    const nodeKind = resolveNodeKind(node)

    if (nodeKind === "start" || nodeKind === "message") {
      if (message) {
        await sendBotMessage({ connectionId, conversationId, to, text: message })
      }

      const next = outgoing[0]?.target
      if (!next) {
        await updateSession(session.id, { current_node_id: null, state: "completed", context })
        return
      }

      node = getNode(flow, next)
      continue
    }

    if (nodeKind === "question") {
      const options = (node.data?.options ?? []).map((item) => item.trim()).filter(Boolean)

      if (!remainingInput) {
        const prompt = buildQuestionText(message || "Escolha uma opção:", options)
        await sendBotMessage({ connectionId, conversationId, to, text: prompt })
        await updateSession(session.id, { current_node_id: node.id, state: "active", context })
        return
      }

      const matchedOption = matchQuestionOption(options, remainingInput)
      if (!matchedOption) {
        const prompt = buildQuestionText(message || "Opção inválida. Tente novamente:", options)
        await sendBotMessage({ connectionId, conversationId, to, text: prompt })
        await updateSession(session.id, { current_node_id: node.id, state: "active", context })
        return
      }

      const matchedEdge =
        outgoing.find((edge) => normalizeText(edge.data?.rule || edge.label || "") === normalizeText(matchedOption)) ||
        outgoing.find((edge) => normalizeText(edge.label || "") === normalizeText(matchedOption)) ||
        outgoing[options.findIndex((option) => normalizeText(option) === normalizeText(matchedOption))] ||
        outgoing.find((edge) => edge.data?.default) ||
        outgoing[0]

      if (!matchedEdge) {
        await updateSession(session.id, { current_node_id: node.id, state: "active", context })
        return
      }

      remainingInput = ""
      node = getNode(flow, matchedEdge.target)
      continue
    }

    if (nodeKind === "condition") {
      const pickedEdge = pickEdgeByRule(outgoing, remainingInput)
      remainingInput = ""

      if (!pickedEdge) {
        await updateSession(session.id, { current_node_id: node.id, state: "active", context })
        return
      }

      node = getNode(flow, pickedEdge.target)
      continue
    }

    if (nodeKind === "action") {
      const actionType = node.data?.actionType || "note"
      const actionValue = node.data?.actionValue || ""

      context = {
        ...context,
        lastAction: {
          type: actionType,
          value: actionValue,
          at: new Date().toISOString()
        }
      }

      if (message) {
        await sendBotMessage({ connectionId, conversationId, to, text: message })
      }

      if (actionType === "route" && actionValue.trim()) {
        const department = actionValue.trim()

        await upsertMetaConversationManagement({
          conversation_id: conversationId,
          connection_id: connectionId,
          status: "open",
          assigned_user_id: null,
          assigned_user_email: null,
          assigned_department: department,
          closed_at: null,
          closed_by_user_id: null
        })

        try {
          const assignedAgent = await tryAutoAssignConversation({
            connectionId,
            conversationId,
            department
          })

          if (assignedAgent) {
            const target = assignedAgent.email || assignedAgent.id
            const transferText = `Atendimento transferido por chatbot para ${target}.`

            await insertMetaMessage({
              conversationId,
              connectionId,
              direction: "outbound",
              status: "sent",
              fromPhone: null,
              toPhone: null,
              type: "system",
              message: transferText,
              rawPayload: {
                event: "auto_transfer",
                by: "chatbot",
                toUserId: assignedAgent.id,
                toUserEmail: assignedAgent.email
              }
            })

            await touchMetaConversation({
              conversationId,
              lastMessage: transferText,
              lastMessageType: "system"
            })
          } else {
            const transferText = "Chatbot concluiu o fluxo, mas nenhum operador elegivel foi encontrado para transferencia."

            await insertMetaMessage({
              conversationId,
              connectionId,
              direction: "outbound",
              status: "sent",
              fromPhone: null,
              toPhone: null,
              type: "system",
              message: transferText,
              rawPayload: {
                event: "auto_transfer_not_assigned",
                by: "chatbot",
                department
              }
            })

            await touchMetaConversation({
              conversationId,
              lastMessage: transferText,
              lastMessageType: "system"
            })
          }
        } catch (distributionError) {
          console.error("Erro ao distribuir conversa automaticamente:", distributionError)
        }

        await updateSession(session.id, { current_node_id: null, state: "completed", context })
        return
      }

      const next = outgoing[0]?.target
      if (!next) {
        await updateSession(session.id, { current_node_id: null, state: "completed", context })
        return
      }

      node = getNode(flow, next)
      continue
    }

    if (nodeKind === "end") {
      if (message) {
        await sendBotMessage({ connectionId, conversationId, to, text: message })
      }

      await updateSession(session.id, { current_node_id: null, state: "completed", context })
      return
    }

    break
  }

  await updateSession(session.id, { current_node_id: node?.id ?? null, state: "active", context })
}
