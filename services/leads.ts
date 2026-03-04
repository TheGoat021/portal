// Tipagem centralizada do status
export type LeadStatus =
  | 'novo'
  | 'em_contato'
  | 'proposta'
  | 'ganho'
  | 'perdido'

/**
 * LISTAR LEADS
 */
export async function getLeads() {
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
  origem_id?: string | null
}) {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nome: data.nome,
      telefone: data.telefone,
      origem_id: data.origem_id ?? null,
      status: 'novo' // sempre começa como novo
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
) {
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
