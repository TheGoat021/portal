export type Venda = {
  id: string
  cliente: {
    nome: string
  }
  origem: {
    nome: string
    plataforma: string
  }
  produto?: string
  valor: number
  data_fechamento: string
}
