'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type FinalizeResponse = {
  ok: boolean
  pending?: boolean
  message?: string
  error?: string
  connection?: {
    id: string
    status: string
    waba_id?: string | null
    phone_number_id?: string | null
    business_id?: string | null
    display_phone_number?: string | null
    verified_name?: string | null
    quality_rating?: string | null
    webhook_verified?: boolean | null
  }
  resolved?: {
    wabaId?: string | null
    phoneNumberId?: string | null
    businessId?: string | null
  }
}

type ConnectionStatusResponse = {
  ok: boolean
  error?: string
  connection?: {
    id: string
    status: string
    provider?: string
    waba_id?: string | null
    phone_number_id?: string | null
    business_id?: string | null
    display_phone_number?: string | null
    verified_name?: string | null
    quality_rating?: string | null
    webhook_verified?: boolean | null
    created_at?: string | null
    updated_at?: string | null
  }
}

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, any>) => void
      login: (
        callback: (response: any) => void,
        params: Record<string, any>
      ) => void
    }
  }
}

type EmbeddedSignupPayload = {
  type?: string | null
  event?: string | null
  code?: string | null
  data?: {
    waba_id?: string | null
    phone_number_id?: string | null
    business_id?: string | null
  } | null
  raw?: string | null
}

type Props = {
  companyId?: string | null
  profileId?: string | null
  onConnected?: (
    connection: NonNullable<ConnectionStatusResponse['connection']>
  ) => void
}

export default function MetaEmbeddedSignup({
  companyId,
  profileId,
  onConnected
}: Props) {
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState<string>('')
  const [errorText, setErrorText] = useState<string>('')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [connectionData, setConnectionData] = useState<ConnectionStatusResponse['connection'] | null>(null)

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const stopRequestedRef = useRef(false)

  const isPending = useMemo(() => connectionStatus === 'pending_waba', [connectionStatus])
  const isConnected = useMemo(() => connectionStatus === 'connected', [connectionStatus])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const fetchConnectionStatus = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/meta/connections/${id}`, {
        method: 'GET',
        cache: 'no-store'
      })

      const data = (await res.json()) as ConnectionStatusResponse

      if (!res.ok || !data?.ok || !data?.connection) {
        throw new Error(data?.error || 'Erro ao consultar status da conexão')
      }

      setConnectionData(data.connection)
      setConnectionStatus(data.connection.status)

      if (data.connection.status === 'connected') {
        setStatusText('WhatsApp conectado com sucesso.')
        stopPolling()
        onConnected?.(data.connection)
      } else if (data.connection.status === 'pending_waba') {
        setStatusText('Conectando... aguardando confirmação da Meta.')
      } else {
        setStatusText(`Status atual: ${data.connection.status}`)
      }
    },
    [onConnected, stopPolling]
  )

  const startPolling = useCallback(
    (id: string) => {
      stopPolling()
      stopRequestedRef.current = false

      pollIntervalRef.current = setInterval(async () => {
        if (stopRequestedRef.current) return

        try {
          await fetchConnectionStatus(id)
        } catch (error: any) {
          console.error('Erro no polling da conexão Meta:', error)
        }
      }, 3000)
    },
    [fetchConnectionStatus, stopPolling]
  )

  useEffect(() => {
    return () => {
      stopRequestedRef.current = true
      stopPolling()
    }
  }, [stopPolling])

  const finalizeConnection = useCallback(
    async (payload: EmbeddedSignupPayload) => {
      const code = payload?.code || null
      const wabaId = payload?.data?.waba_id || null
      const phoneNumberId = payload?.data?.phone_number_id || null
      const businessId = payload?.data?.business_id || null

      if (!code) {
        throw new Error('Code não encontrado no retorno do Embedded Signup')
      }

      setLoading(true)
      setErrorText('')
      setStatusText('Finalizando conexão com a Meta...')

      try {
        const res = await fetch('/api/meta/embedded-signup/finalize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code,
            wabaId,
            phoneNumberId,
            businessId,
            companyId: companyId ?? null,
            profileId: profileId ?? null,
            rawEvent: payload
          })
        })

        const data = (await res.json()) as FinalizeResponse

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Erro ao finalizar conexão')
        }

        if (data.connection?.id) {
          setConnectionId(data.connection.id)
        }

        if (data.connection?.status) {
          setConnectionStatus(data.connection.status)
        }

        if (data.connection) {
          setConnectionData({
            id: data.connection.id,
            status: data.connection.status,
            waba_id: data.connection.waba_id ?? null,
            phone_number_id: data.connection.phone_number_id ?? null,
            business_id: data.connection.business_id ?? null,
            display_phone_number: data.connection.display_phone_number ?? null,
            verified_name: data.connection.verified_name ?? null,
            quality_rating: data.connection.quality_rating ?? null,
            webhook_verified: data.connection.webhook_verified ?? null
          })
        }

        if (data.pending && data.connection?.id) {
          setStatusText(
            data.message || 'Conectando... aguardando confirmação da Meta.'
          )

          await fetchConnectionStatus(data.connection.id)
          startPolling(data.connection.id)
          return
        }

        if (data.connection?.status === 'connected' && data.connection.id) {
          setStatusText('WhatsApp conectado com sucesso.')

          onConnected?.({
            id: data.connection.id,
            status: data.connection.status,
            waba_id: data.connection.waba_id ?? null,
            phone_number_id: data.connection.phone_number_id ?? null,
            business_id: data.connection.business_id ?? null,
            display_phone_number: data.connection.display_phone_number ?? null,
            verified_name: data.connection.verified_name ?? null,
            quality_rating: data.connection.quality_rating ?? null,
            webhook_verified: data.connection.webhook_verified ?? null
          })
          return
        }

        setStatusText(data.message || 'Conexão finalizada.')
      } finally {
        setLoading(false)
      }
    },
    [companyId, profileId, fetchConnectionStatus, startPolling, onConnected]
  )

  useEffect(() => {
    function parseEmbeddedSignupMessage(event: MessageEvent): EmbeddedSignupPayload | null {
      try {
        if (!event?.data) return null

        if (typeof event.data === 'string') {
          const trimmed = event.data.trim()

          if (!trimmed) return null

          try {
            const parsed = JSON.parse(trimmed)
            return {
              type: parsed?.type ?? null,
              event: parsed?.event ?? null,
              code: parsed?.code ?? null,
              data: parsed?.data ?? null,
              raw: trimmed
            }
          } catch {
            const url = new URL(trimmed)
            const code = url.searchParams.get('code')

            if (!code) return null

            return {
              type: 'WA_EMBEDDED_SIGNUP',
              event: null,
              code,
              data: {
                waba_id: null,
                phone_number_id: null,
                business_id: null
              },
              raw: trimmed
            }
          }
        }

        if (typeof event.data === 'object') {
          const raw = event.data as any

          return {
            type: raw?.type ?? null,
            event: raw?.event ?? null,
            code: raw?.code ?? null,
            data: raw?.data ?? null,
            raw: JSON.stringify(raw)
          }
        }

        return null
      } catch (error) {
        console.error('Erro ao interpretar postMessage do Embedded Signup:', error)
        return null
      }
    }

    async function handleMessage(event: MessageEvent) {
      const payload = parseEmbeddedSignupMessage(event)
      if (!payload) return

      const messageType = payload.type || 'desconhecido'
      const eventName = payload.event || 'sem event'

      console.log(`Tipo recebido: ${messageType} | Evento: ${eventName}`)

      if (payload.type !== 'WA_EMBEDDED_SIGNUP') {
        return
      }

      console.log('Dados parciais recebidos:')
      console.log('Code:', payload.code ? 'sim' : 'não')
      console.log('WABA:', payload.data?.waba_id ? 'sim' : 'não')
      console.log('PHONE_NUMBER_ID:', payload.data?.phone_number_id ? 'sim' : 'não')
      console.log('BUSINESS_ID:', payload.data?.business_id ? 'sim' : 'não')

      if (!payload.code) {
        setErrorText('Não foi possível capturar o code do Embedded Signup.')
        return
      }

      console.log('Code disponível, chamando finalizeConnection...')

      try {
        await finalizeConnection(payload)
        console.log('Finalize deu certo')
      } catch (error: any) {
        console.error('Erro ao finalizar conexão:', error)
        setErrorText(error?.message || 'Erro ao finalizar conexão com a Meta')
        setStatusText('')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [finalizeConnection])

  const handleOpenSignup = useCallback(() => {
    setErrorText('')
    setStatusText('')
    stopPolling()

    if (!window.FB) {
      setErrorText('SDK do Facebook não carregado.')
      return
    }

    setLoading(true)

    try {
      window.FB.login(
        function () {
          console.log('FB.login retornou')
          setLoading(false)
        },
        {
          config_id: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {}
          }
        }
      )
    } catch (error: any) {
      setLoading(false)
      setErrorText(error?.message || 'Erro ao abrir Embedded Signup')
    }
  }, [stopPolling])

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      {/* resto do JSX */}
    </div>
  )
}