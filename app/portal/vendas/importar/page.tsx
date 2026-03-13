'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

export default function ImportarVendasPage() {
  const [loading, setLoading] = useState(false)

  async function handleFile(file: File) {
    const data = await file.arrayBuffer()

    const workbook = XLSX.read(data)

    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    const json: any[] = XLSX.utils.sheet_to_json(sheet)

    setLoading(true)

    try {
      const res = await fetch('/api/vendas/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ rows: json })
})

const text = await res.text()
const result = text ? JSON.parse(text) : null

if (!res.ok) {
  throw new Error(result?.error || 'Erro ao importar vendas')
}

      alert(`Importação concluída: ${result.imported} vendas`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">
        Importar vendas via Excel
      </h1>

      <p className="text-sm text-gray-500 mb-6">
        Colunas esperadas:
        Cliente | Vendedor | Telefone | E-mail | CPF | Origem | Produto | Valor | Data
      </p>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {loading && (
        <p className="mt-4 text-sm text-gray-500">
          Importando vendas...
        </p>
      )}
    </div>
  )
}