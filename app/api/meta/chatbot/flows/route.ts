import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import type { ChatbotFlow } from "@/lib/metaChatbot"

function emptyFlow(): ChatbotFlow {
  return { nodes: [], edges: [] }
}

function normalizeFlow(payload: unknown): ChatbotFlow {
  const flow = payload as ChatbotFlow | null
  return {
    nodes: Array.isArray(flow?.nodes) ? flow.nodes : [],
    edges: Array.isArray(flow?.edges) ? flow.edges : []
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const connectionId = url.searchParams.get("connectionId") || ""

    if (!connectionId) {
      return NextResponse.json({ ok: false, error: "connectionId é obrigatório" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("meta_chatbot_flows")
      .select("connection_id, draft_flow, published_flow, updated_at, published_at")
      .eq("connection_id", connectionId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      data: {
        connectionId,
        draftFlow: normalizeFlow(data?.draft_flow ?? emptyFlow()),
        publishedFlow: normalizeFlow(data?.published_flow ?? emptyFlow()),
        updatedAt: data?.updated_at ?? null,
        publishedAt: data?.published_at ?? null
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar fluxo do chatbot"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      connectionId?: string
      flow?: ChatbotFlow
    }

    const connectionId = String(body?.connectionId || "")
    if (!connectionId) {
      return NextResponse.json({ ok: false, error: "connectionId é obrigatório" }, { status: 400 })
    }

    const flow = normalizeFlow(body?.flow ?? emptyFlow())

    const { data, error } = await supabaseAdmin
      .from("meta_chatbot_flows")
      .upsert(
        {
          connection_id: connectionId,
          draft_flow: flow,
          updated_at: new Date().toISOString()
        },
        { onConflict: "connection_id" }
      )
      .select("connection_id, updated_at")
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      data: {
        connectionId: data.connection_id,
        updatedAt: data.updated_at
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao salvar fluxo do chatbot"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

