import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function normalize(value?: string) {
  if (!value) return null
  return String(value).replace(/\D/g, '')
}

function parseExcelDate(value: any): string | null {
  if (!value) return null

  // Caso venha como número serial do Excel
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const parsed = new Date(excelEpoch.getTime() + value * 86400000)

    const year = parsed.getUTCFullYear()
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
    const day = String(parsed.getUTCDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const str = String(value).trim()

  // Já está em ISO: YYYY-MM-DD ou YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10)
  }

  // Formato BR: DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/')
    return `${year}-${month}-${day}`
  }

  // Formato BR com hífen: DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [day, month, year] = str.split('-')
    return `${year}-${month}-${day}`
  }

  // Última tentativa
  const parsed = new Date(str)

  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  return null
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { rows } = body

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: 'Planilha inválida' },
        { status: 400 }
      )
    }

    let imported = 0

    for (const row of rows) {
      const {
        Cliente,
        Vendedor,
        Telefone,
        'E-mail': Email,
        CPF,
        Origem,
        Produto,
        Valor,
        Data
      } = row

      if (!Cliente || !Valor) continue

      let clienteId: string | null = null
      const cpfNormalizado = normalize(CPF)
      const telefoneNormalizado = normalize(Telefone)

      let existing: any = null

      if (cpfNormalizado) {
        const { data } = await supabaseAdmin
          .from('clientes')
          .select('id')
          .eq('cpf', cpfNormalizado)
          .maybeSingle()

        existing = data
      }

      if (!existing && telefoneNormalizado) {
        const { data } = await supabaseAdmin
          .from('clientes')
          .select('id')
          .eq('telefone', telefoneNormalizado)
          .maybeSingle()

        existing = data
      }

      if (existing) {
        clienteId = existing.id
      } else {
        const { data: cliente, error: clienteError } = await supabaseAdmin
          .from('clientes')
          .insert({
            nome: Cliente,
            telefone: telefoneNormalizado,
            email: Email || null,
            cpf: cpfNormalizado,
            vendedor: Vendedor || null
          })
          .select('id')
          .single()

        if (clienteError) {
          return NextResponse.json(
            { error: `Erro ao criar cliente ${Cliente}: ${clienteError.message}` },
            { status: 500 }
          )
        }

        clienteId = cliente.id
      }

      let origemId: string | null = null

      if (Origem) {
        const { data: origem } = await supabaseAdmin
          .from('origens')
          .select('id')
          .ilike('nome', String(Origem).trim())
          .maybeSingle()

        origemId = origem?.id ?? null
      }

      const { error: vendaError } = await supabaseAdmin
        .from('vendas')
        .insert({
          cliente_id: clienteId,
          origem_id: origemId,
          produto: Produto || null,
          valor: Number(Valor),
          data_fechamento: parseExcelDate(Data),
          plataforma: 'manual'
        })

      if (vendaError) {
        return NextResponse.json(
          { error: `Erro ao criar venda de ${Cliente}: ${vendaError.message}` },
          { status: 500 }
        )
      }

      imported++
    }

    return NextResponse.json({ success: true, imported })
  } catch (error: any) {
    console.error('Erro na importação de vendas:', error)

    return NextResponse.json(
      { error: error?.message || 'Erro interno na importação' },
      { status: 500 }
    )
  }
}