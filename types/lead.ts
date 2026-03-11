export type LeadStatus =
  | 'novo'
  | 'em_contato'
  | 'proposta'
  | 'ganho'
  | 'perdido'

export interface Lead {
  id: string
  conversation_id?: string | null
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