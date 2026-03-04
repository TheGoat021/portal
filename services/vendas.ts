/**
 * CRIAR VENDA MANUAL
 */
export async function createVenda(data: {
  cliente_id: string
  valor: number
  produto?: string
  origem_id?: string
}) {
  if (!data.cliente_id) {
    throw new Error('cliente_id é obrigatório')
  }

  if (!data.valor || data.valor <= 0) {
    throw new Error('valor inválido')
  }

  const res = await fetch('/api/vendas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Erro ao criar venda')
  }

  return res.json()
}

/**
 * CRIAR VENDA A PARTIR DE LEAD
 */
export async function createVendaFromLead(data: {
  lead_id: string
  valor: number
  produto?: string
}) {
  if (!data.lead_id) {
    throw new Error('lead_id é obrigatório')
  }

  if (!data.valor || data.valor <= 0) {
    throw new Error('valor inválido')
  }

  const res = await fetch('/api/vendas/from-lead', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(
      err.error || 'Erro ao criar venda a partir do lead'
    )
  }

  return res.json()
}

/**
 * LISTAR VENDAS (COM FILTROS)
 */
export async function getVendas(
  params?: Record<string, string>
) {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : ''

  const res = await fetch(`/api/vendas${query}`)

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Erro ao buscar vendas')
  }

  return res.json()
}

/**
 * ATUALIZAR VENDA
 */
export async function updateVenda(
  vendaId: string,
  data: {
    produto?: string
    valor?: number
    data_fechamento?: string
    origem_id?: string
  }
) {
  if (!vendaId) {
    throw new Error('ID da venda não informado')
  }

  const res = await fetch(`/api/vendas/${vendaId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Erro ao atualizar venda')
  }

  return res.json()
}
