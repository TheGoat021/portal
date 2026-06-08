"use client"

import { useEffect, useState } from "react"
import QRCode from "react-qr-code"

import { WhatsAppConfigSubmenu } from "@/components/WhatsAppConfigSubmenu"

export default function WhatsAppConnect() {
  const [qr, setQr] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    const res = await fetch("https://apiwhats.drdetodos.com.br/qr")
    const data = await res.json()
    setQr(data.qr)
    setConnected(data.connected)
  }

  useEffect(() => {
    const initialTimeout = setTimeout(fetchStatus, 0)
    const interval = setInterval(fetchStatus, 3000)
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [])

  const handleRestart = async () => {
    setLoading(true)
    await fetch("https://apiwhats.drdetodos.com.br/restart", {
      method: "POST"
    })
    setTimeout(fetchStatus, 2000)
    setLoading(false)
  }

  const handleDisconnect = async () => {
    setLoading(true)
    await fetch("https://apiwhats.drdetodos.com.br/disconnect", {
      method: "POST"
    })
    setTimeout(fetchStatus, 1000)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <WhatsAppConfigSubmenu />

      <div className="flex min-h-[calc(100vh-180px)] flex-col items-center justify-center rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(245,249,255,0.7))] p-10 shadow-[0_20px_48px_rgba(148,163,184,0.1)] backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-slate-950">
          Conectar WhatsApp
        </h1>

        <div className="mt-6">
          {connected ? (
            <div className="font-semibold text-green-600">
              WhatsApp Conectado
            </div>
          ) : qr ? (
            <QRCode value={qr} size={256} />
          ) : (
            <p className="text-slate-500">Aguardando QR...</p>
          )}
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleRestart}
            disabled={loading}
            className="rounded-2xl bg-[linear-gradient(135deg,rgba(96,165,250,0.94),rgba(34,211,238,0.9),rgba(167,139,250,0.84))] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(96,165,250,0.22)]"
          >
            Gerar Novo QR
          </button>

          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600"
          >
            Desconectar
          </button>
        </div>
      </div>
    </div>
  )
}
