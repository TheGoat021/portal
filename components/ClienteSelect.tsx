'use client'

import { useEffect, useState } from 'react'

type Cliente = {
  id: string
  nome: string
  telefone: string
}

export default function ClienteSelect({
  onChange
}: {
  onChange: (id: string) => void
}) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadClientes()
  }, [])

  async function loadClientes() {
    try {
      const res = await fetch('/api/clientes')

      if (!res.ok) {
        setClientes([])
        return
      }

      const data = await res.json()

      // 🛡️ Blindagem
      if (Array.isArray(data)) {
        setClientes(data)
      } else {
        setClientes([])
      }
    } catch {
      setClientes([])
    }
  }

  const filtered = clientes.filter(c =>
    `${c.nome} ${c.telefone}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div>
      <input
        className="border p-2 w-full"
        placeholder="Buscar cliente por nome ou telefone"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="border max-h-40 overflow-y-auto mt-1">
        {filtered.map(c => (
          <div
            key={c.id}
            className="p-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => onChange(c.id)}
          >
            <strong>{c.nome}</strong>
            <div className="text-sm text-gray-500">
              {c.telefone}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
