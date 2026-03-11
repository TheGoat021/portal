// Tipagem centralizada do status
export type LeadStatus =
  | 'novo'
  | 'em_contato'
  | 'proposta'
  | 'ganho'
  | 'perdido'

export interface Lead {
  id: string
  status: LeadStatus
  created_at?: string
  cliente: {
    id: string
    nome: string
    telefone: string
    email?: string | null
  }
  origem: {
    id: string
    nome: string
    plataforma?: string | null
  }
}

/**
 * LISTAR LEADS
 */
export async function getLeads(): Promise<Lead[]> {
  const res = await fetch('/api/leads', {
    method: 'GET'
  })

  if (!res.ok) {
    throw new Error('Erro ao buscar leads')
  }

  return res.json()
}

/**
 * CRIAR LEAD
 */
export async function createLead(data: {
  nome: string
  telefone: string
  email?: string | null
  origem_id?: string | null
}): Promise<Lead> {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nome: data.nome,
      telefone: data.telefone,
      email: data.email ?? null,
      origem_id: data.origem_id ?? null
    })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Erro ao criar lead')
  }

  return res.json()
}

/**
 * ATUALIZAR STATUS DO LEAD (MOVER NO PIPELINE)
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<Lead> {
  const res = await fetch(`/api/leads/${leadId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Erro ao atualizar lead')
  }

  return res.json()
}