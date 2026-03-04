'use client'

import { useState, useEffect } from 'react'
import { createLead } from '@/services/leads'
  
interface Origem {
  id: string
  nome: string
  plataforma: string
}

export default function NovoLeadModal({ onClose, onSaved }: any) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [origemId, setOrigemId] = useState<string | null>(null)
  const [origens, setOrigens] = useState<Origem[]>([])

  useEffect(() => {
    fetch('/api/origens')
      .then(res => {
        if (!res.ok) {
          throw new Error('Erro ao buscar origens')
        }
        return res.json()
      })
      .then(setOrigens)
      .catch(err => {
        console.error(err)
        alert('Erro ao carregar origens')
      })
  }, [])

  async function handleSave() {
  if (!nome || !telefone) {
    alert('Nome e telefone são obrigatórios')
    return
  }

  await createLead({
    nome,
    telefone,
    origem_id: origemId // 👈 mapeamento correto
  })

  onSaved()
  onClose()
}


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 w-[400px] rounded">
        <h2 className="text-xl mb-4">Novo Lead</h2>

        <input
          className="border p-2 w-full mb-2"
          placeholder="Nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-2"
          placeholder="Telefone / WhatsApp"
          value={telefone}
          onChange={e => setTelefone(e.target.value)}
        />

        <select
          className="border p-2 w-full mb-2"
          value={origemId ?? ''}
          onChange={e => setOrigemId(e.target.value || null)}
        >
          <option value="">Selecione a origem</option>

          {origens.map(o => (
            <option key={o.id} value={o.id}>
              {o.nome} ({o.plataforma})
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose}>Cancelar</button>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
