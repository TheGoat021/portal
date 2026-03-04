export type LeadStatus =
  | 'novo'
  | 'em_contato'
  | 'proposta'
  | 'ganho'
  | 'perdido'

export interface Lead {
  id: string
  status: LeadStatus
  cliente: {
    nome: string
    telefone: string
  }
  origem: {
    nome: string
    plataforma: string
  }
}
