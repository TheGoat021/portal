"use client"

import { useEffect, useState } from "react"
import QRCode from "react-qr-code"

export default function WhatsAppConnect() {
  const [qr, setQr] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    const res = await fetch("http://apiwhats.drdetodos.com.br/qr")
    const data = await res.json()
    setQr(data.qr)
    setConnected(data.connected)
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleRestart = async () => {
    setLoading(true)
    await fetch("http://apiwhats.drdetodos.com.br/restart", {
      method: "POST"
    })
    setTimeout(fetchStatus, 2000)
    setLoading(false)
  }

  const handleDisconnect = async () => {
    setLoading(true)
    await fetch("http://apiwhats.drdetodos.com.br/disconnect", {
      method: "POST"
    })
    setTimeout(fetchStatus, 1000)
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-10 space-y-6">
      <h1 className="text-2xl font-bold">
        Conectar WhatsApp
      </h1>

      {connected ? (
        <div className="text-green-600 font-semibold">
          ✅ WhatsApp Conectado
        </div>
      ) : qr ? (
        <QRCode value={qr} size={256} />
      ) : (
        <p>Aguardando QR...</p>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleRestart}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Gerar Novo QR
        </button>

        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Desconectar
        </button>
      </div>
    </div>
  )
}