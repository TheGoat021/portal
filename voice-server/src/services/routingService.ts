import { supabaseAdmin } from "../supabase.js"

type QueueMemberAgent = {
  id: string
  user_id: string | null
  name: string
  extension: string
  status: string
  current_call_id: string | null
  updated_at: string | null
}

type QueueMemberRow = {
  id: string
  queue_id: string
  agent_id: string
  priority: number
  active: boolean
  agent: QueueMemberAgent | QueueMemberAgent[] | null
}

type NormalizedQueueMemberRow = Omit<QueueMemberRow, "agent"> & {
  agent: QueueMemberAgent | null
}

type QueueRoutingRow = {
  id: string
  name: string
  slug: string
  description: string | null
  inbound_number: string | null
  greeting_audio_url: string | null
  greeting_audio_name: string | null
  strategy: string
  max_wait_seconds: number
  active: boolean
  members: NormalizedQueueMemberRow[]
}

function buildInboundNumberVariants(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "")
  if (!digits) return []

  const variants = new Set<string>()
  variants.add(digits)

  if (digits.startsWith("55")) {
    variants.add(digits.slice(2))
  } else if (digits.length >= 10 && digits.length <= 11) {
    variants.add(`55${digits}`)
  }

  return Array.from(variants).filter(Boolean)
}

export async function resolveQueueForInboundNumber(input: {
  calledNumber?: string | null
  didNumber?: string | null
  dialedExtension?: string | null
}) {
  const candidates = [
    ...buildInboundNumberVariants(input.calledNumber),
    ...buildInboundNumberVariants(input.didNumber),
    ...buildInboundNumberVariants(input.dialedExtension)
  ].filter(Boolean)

  for (const candidate of candidates) {
    const { data, error } = await supabaseAdmin
      .from("voice_queues")
      .select(`
        id,
        name,
        slug,
        description,
        inbound_number,
        greeting_audio_url,
        greeting_audio_name,
        strategy,
        max_wait_seconds,
        active,
        members:voice_queue_agents(
          id,
          queue_id,
          agent_id,
          priority,
          active,
          agent:voice_agents(
            id,
            user_id,
            name,
            extension,
            status,
            current_call_id,
            updated_at
          )
        )
      `)
      .eq("active", true)
      .eq("inbound_number", candidate)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to resolve inbound queue: ${error.message}`)
    }

    if (data?.id) {
      return {
        ...(data as any),
        members: ((data as any).members ?? []).map((member: any) => ({
          ...member,
          agent: Array.isArray(member.agent)
            ? member.agent[0] ?? null
            : member.agent ?? null
        }))
      } as QueueRoutingRow
    }
  }

  return null
}

export function selectEligibleAgents(queue: QueueRoutingRow) {
  const eligible = (queue.members ?? [])
    .filter((member) => member.active && member.agent)
    .filter((member) => member.agent?.status === "available")
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }

      return (a.agent?.name || "").localeCompare(b.agent?.name || "")
    })

  if (eligible.length === 0) {
    return []
  }

  const topPriority = eligible[0]?.priority ?? 1
  const topTier = eligible.filter((member) => member.priority === topPriority)

  switch (queue.strategy) {
    case "random": {
      const index = Math.floor(Math.random() * topTier.length)
      return [topTier[index]]
    }
    case "leastrecent":
    case "fewestcalls":
    case "rrmemory":
      return [topTier[0]]
    case "ringall":
    default:
      return topTier
  }
}
