'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  Phone,
  ShieldCheck,
  Smartphone,
  Building2,
  RefreshCcw,
  AlertCircle,
  Clock3,
} from 'lucide-react'

declare global {
  interface Window {
    fbAsyncInit?: () => void
    FB?: {
      init: (params: Record<string, any>) => void
      login: (
        callback: (response: any) => void,
        params: Record<string, any>
      ) => void
    }
  }
}

type ConfigResponse = {
  ok: boolean
  appId: string
  configId: string
  apiVersion: string
  error?: string
}

type Connection = {
  id: string
  display_phone_number: string | null
  verified_name: string | null
  quality_rating: string | null
  waba_id: string | null
  phone_number_id: string | null
  business_id?: string | null
  webhook_verified?: boolean | null
  status: string
  created_at: string
  updated_at?: string | null
}

type AvailablePhone = {
  id: string
  display_phone_number?: string | null
  verified_name?: string | null
  quality_rating?: string | null
  waba_id: string
  business_id: string | null
}

type FinalizeResponse = {
  ok: boolean
  pending?: boolean
  needs_phone_selection?: boolean
  message?: string
  error?: string
  connection?: Connection
  phoneNumbers?: AvailablePhone[]
}

type ConnectionStatusResponse = {
  ok: boolean
  error?: string
  connection?: Connection
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function MetaWhatsAppConnectCard() {
  const [config, setConfig] = useState<ConfigResponse | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [sdkReady, setSdkReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'waiting-meta' | 'saving' | 'success' | 'error'
  >('idle')
  const [error, setError] = useState('')
  const [connection, setConnection] = useState<Connection | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  const [availablePhones, setAvailablePhones] = useState<AvailablePhone[]>([])
  const [selectedPhoneId, setSelectedPhoneId] = useState('')

  const signupDataRef = useRef<{
    code?: string
    wabaId?: string
    phoneNumberId?: string
    businessId?: string
    rawEvent?: unknown
    finalizeStarted?: boolean
  }>({})

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const canConnect = useMemo(() => {
    return Boolean(config?.ok && sdkReady && !busy)
  }, [config, sdkReady, busy])

  const isPendingConnection = connection?.status === 'pending_waba'
  const isConnected = connection?.status === 'connected'

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true)
    setError('')

    try {
      const res = await fetch('/api/meta/embedded-signup/config', {
        cache: 'no-store',
      })

      const data = (await res.json()) as ConfigResponse

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao carregar configuração')
      }

      setConfig(data)
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar configuração')
    } finally {
      setLoadingConfig(false)
    }
  }, [])

  const fetchConnectionById = useCallback(async (id: string) => {
    const res = await fetch(`/api/meta/connections/${id}`, {
      method: 'GET',
      cache: 'no-store',
    })

    const contentType = res.headers.get('content-type') || ''
    const rawText = await res.text()

    if (!contentType.includes('application/json')) {
      throw new Error(
        `A rota /api/meta/connections/${id} não retornou JSON. Resposta recebida: ${rawText.slice(0, 120)}`
      )
    }

    const data = JSON.parse(rawText) as ConnectionStatusResponse

    if (!res.ok || !data.ok || !data.connection) {
      throw new Error(data.error || 'Erro ao consultar conexão')
    }

    return data.connection
  }, [])

  const startPollingConnection = useCallback(
    (connectionId: string) => {
      stopPolling()

      pollingRef.current = setInterval(async () => {
        try {
          const latest = await fetchConnectionById(connectionId)
          setConnection(latest)

          if (latest.status === 'connected') {
            stopPolling()
            setBusy(false)
            setStatus('success')
            setStatusMessage('Conexão concluída com sucesso.')
            setError('')
          } else if (latest.status === 'pending_waba') {
            setStatus('success')
            setStatusMessage(
              'Conectando... aguardando confirmação da Meta para vincular o WABA e o número.'
            )
          } else {
            setStatusMessage(`Status atual: ${latest.status}`)
          }
        } catch (err: any) {
          console.error('Erro ao consultar status da conexão Meta:', err)
        }
      }, 3000)
    },
    [fetchConnectionById, stopPolling]
  )

  const finalizeConnection = useCallback(async () => {
    const code = signupDataRef.current.code

    if (!code) {
      setStatus('error')
      setError('Finalize bloqueado: code não encontrado')
      return
    }

    if (signupDataRef.current.finalizeStarted) {
      return
    }

    signupDataRef.current.finalizeStarted = true

    try {
      setBusy(true)
      setStatus('saving')
      setError('')
      setStatusMessage('Finalizando conexão com a Meta...')

      const res = await fetch('/api/meta/embedded-signup/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          wabaId: signupDataRef.current.wabaId,
          phoneNumberId: signupDataRef.current.phoneNumberId,
          businessId: signupDataRef.current.businessId,
          pin: pin.trim() || undefined,
          rawEvent: signupDataRef.current.rawEvent,
        }),
      })

      const data = (await res.json()) as FinalizeResponse

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao finalizar conexão')
      }

      if (data.needs_phone_selection) {
        setAvailablePhones(data.phoneNumbers || [])
        setSelectedPhoneId('')
        setBusy(false)
        setStatus('idle')
        setStatusMessage('Escolha o número que deseja conectar.')
        signupDataRef.current.finalizeStarted = false
        return
      }

      if (data.connection) {
        setConnection(data.connection)
      }

      if (data.pending && data.connection?.id) {
        setStatus('success')
        setStatusMessage(
          data.message ||
            'Conectando... aguardando confirmação da Meta para vincular o WABA e o número.'
        )

        startPollingConnection(data.connection.id)
        return
      }

      if (data.connection?.status === 'connected') {
        setAvailablePhones([])
        setSelectedPhoneId('')
        setStatus('success')
        setStatusMessage('Conexão concluída com sucesso.')
        return
      }

      setStatus('success')
      setStatusMessage(data.message || 'Conexão processada.')
    } catch (err: any) {
      signupDataRef.current.finalizeStarted = false
      setStatus('error')
      setError(err?.message || 'Erro ao finalizar conexão')
      setStatusMessage('')
    } finally {
      setBusy(false)
    }
  }, [pin, startPollingConnection])

  const submitSelectedPhone = useCallback(async () => {
    if (!selectedPhoneId) return

    const selectedPhone = availablePhones.find((item) => item.id === selectedPhoneId)

    if (!selectedPhone) {
      setStatus('error')
      setError('Número selecionado inválido')
      return
    }

    try {
      setBusy(true)
      setStatus('saving')
      setError('')
      setStatusMessage('Conectando número selecionado...')

      const res = await fetch('/api/meta/embedded-signup/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: signupDataRef.current.code,
          wabaId: selectedPhone.waba_id,
          businessId: selectedPhone.business_id,
          phoneNumberId: selectedPhone.id,
          pin: pin.trim() || undefined,
          rawEvent: signupDataRef.current.rawEvent,
        }),
      })

      const data = (await res.json()) as FinalizeResponse

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao conectar número')
      }

      if (data.connection) {
        setConnection(data.connection)
      }

      if (data.pending && data.connection?.id) {
        setAvailablePhones([])
        setSelectedPhoneId('')
        setBusy(false)
        setStatus('success')
        setStatusMessage(
          data.message ||
            'Conectando... aguardando confirmação da Meta para vincular o WABA e o número.'
        )
        startPollingConnection(data.connection.id)
        return
      }

      setAvailablePhones([])
      setSelectedPhoneId('')
      setBusy(false)
      setStatus('success')
      setStatusMessage('Número conectado com sucesso.')
    } catch (err: any) {
      setBusy(false)
      setStatus('error')
      setError(err?.message || 'Erro ao conectar número')
      setStatusMessage('')
    }
  }, [availablePhones, pin, selectedPhoneId, startPollingConnection])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  useEffect(() => {
    if (!config?.appId) return

    const existingScript = document.getElementById('facebook-jssdk')
    if (existingScript) {
      setSdkReady(true)
      return
    }

    window.fbAsyncInit = function () {
      window.FB?.init({
        appId: config.appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: config.apiVersion,
      })
      setSdkReady(true)
    }

    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'

    document.body.appendChild(script)

    return () => {
      window.fbAsyncInit = undefined
    }
  }, [config])

  useEffect(() => {
    function tryParseMessageData(raw: any) {
      if (!raw) return null

      if (typeof raw === 'object') {
        return raw
      }

      if (typeof raw !== 'string') {
        return null
      }

      const text = raw.trim()
      if (!text) return null

      try {
        return JSON.parse(text)
      } catch {}

      const normalized = text.startsWith('?') ? text.slice(1) : text

      try {
        const params = new URLSearchParams(normalized)

        const event = params.get('event')
        const wabaId = params.get('waba_id')
        const phoneNumberId = params.get('phone_number_id')
        const businessId = params.get('business_id')
        const type = params.get('type')
        const code = params.get('code')

        if (event || wabaId || phoneNumberId || businessId || type || code) {
          return {
            type: type || 'WA_EMBEDDED_SIGNUP',
            event,
            code,
            data: {
              waba_id: wabaId,
              phone_number_id: phoneNumberId,
              business_id: businessId,
            },
            raw: text,
          }
        }
      } catch {}

      try {
        const url = new URL(text)
        const code = url.searchParams.get('code')

        if (code) {
          return {
            type: 'WA_EMBEDDED_SIGNUP',
            event: null,
            code,
            data: {
              waba_id: null,
              phone_number_id: null,
              business_id: null,
            },
            raw: text,
          }
        }
      } catch {}

      return { raw: text }
    }

    function extractSignupPayload(parsed: any) {
      const eventName =
        parsed?.event ||
        parsed?.data?.event ||
        parsed?.finish?.event ||
        parsed?.payload?.event ||
        parsed?.message?.event ||
        null

      const wabaId =
        parsed?.data?.waba_id ||
        parsed?.data?.wabaId ||
        parsed?.finish?.waba_id ||
        parsed?.finish?.wabaId ||
        parsed?.payload?.waba_id ||
        parsed?.payload?.wabaId ||
        parsed?.message?.waba_id ||
        parsed?.message?.wabaId ||
        parsed?.waba_id ||
        parsed?.wabaId ||
        null

      const phoneNumberId =
        parsed?.data?.phone_number_id ||
        parsed?.data?.phoneNumberId ||
        parsed?.finish?.phone_number_id ||
        parsed?.finish?.phoneNumberId ||
        parsed?.payload?.phone_number_id ||
        parsed?.payload?.phoneNumberId ||
        parsed?.message?.phone_number_id ||
        parsed?.message?.phoneNumberId ||
        parsed?.phone_number_id ||
        parsed?.phoneNumberId ||
        null

      const businessId =
        parsed?.data?.business_id ||
        parsed?.data?.businessId ||
        parsed?.finish?.business_id ||
        parsed?.finish?.businessId ||
        parsed?.payload?.business_id ||
        parsed?.payload?.businessId ||
        parsed?.message?.business_id ||
        parsed?.message?.businessId ||
        parsed?.business_id ||
        parsed?.businessId ||
        null

      const oauthCode =
        parsed?.code ||
        parsed?.data?.code ||
        parsed?.payload?.code ||
        parsed?.message?.code ||
        null

      const type =
        parsed?.type ||
        parsed?.data?.type ||
        parsed?.payload?.type ||
        parsed?.message?.type ||
        'WA_EMBEDDED_SIGNUP'

      return {
        type,
        event: eventName,
        wabaId,
        phoneNumberId,
        businessId,
        oauthCode,
      }
    }

    function onMessage(event: MessageEvent) {
      const parsed = tryParseMessageData(event.data)
      if (!parsed) return

      const extracted = extractSignupPayload(parsed)

      console.log(
        `Tipo recebido: ${extracted.type || 'sem type'} | Evento: ${extracted.event || 'sem event'}`
      )

      if (extracted.type !== 'WA_EMBEDDED_SIGNUP') {
        return
      }

      if (extracted.oauthCode && !signupDataRef.current.code) {
        signupDataRef.current.code = extracted.oauthCode
        console.log('Code capturado via postMessage')
      }

      if (extracted.wabaId) {
        signupDataRef.current.wabaId = extracted.wabaId
      }

      if (extracted.phoneNumberId) {
        signupDataRef.current.phoneNumberId = extracted.phoneNumberId
      }

      if (extracted.businessId) {
        signupDataRef.current.businessId = extracted.businessId
      }

      if (
        extracted.oauthCode ||
        extracted.wabaId ||
        extracted.phoneNumberId ||
        extracted.businessId
      ) {
        signupDataRef.current.rawEvent = parsed

        console.log('Dados parciais recebidos:', {
          code: signupDataRef.current.code ? 'sim' : 'não',
          wabaId: signupDataRef.current.wabaId || null,
          phoneNumberId: signupDataRef.current.phoneNumberId || null,
          businessId: signupDataRef.current.businessId || null,
        })
      }

      if (extracted.event === 'ERROR') {
        setBusy(false)
        setStatus('error')
        setError('A Meta retornou um erro durante a conexão.')
        setStatusMessage('')
        return
      }

      if (extracted.event === 'CANCEL') {
        setBusy(false)
        setStatus('idle')
        setStatusMessage('')
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  const openEmbeddedSignup = useCallback(() => {
    if (!window.FB || !config?.configId) return

    stopPolling()
    setBusy(true)
    setStatus('waiting-meta')
    setError('')
    setStatusMessage('Aguardando conclusão do Embedded Signup...')
    setConnection(null)
    setAvailablePhones([])
    setSelectedPhoneId('')

    signupDataRef.current = {
      finalizeStarted: false,
    }

    window.FB.login(
      (response: any) => {
        console.log('FB.login retornou')

        if (!response?.authResponse?.code) {
          setBusy(false)
          setStatus('error')
          setError('A Meta não retornou o code do Embedded Signup.')
          setStatusMessage('')
          return
        }

        signupDataRef.current.code = response.authResponse.code
        console.log('Code recebido com sucesso')

        setBusy(false)
        setStatus('waiting-meta')
        setStatusMessage('Code recebido. Finalizando com o backend...')

        if (!signupDataRef.current.finalizeStarted) {
          void finalizeConnection()
        }
      },
      {
        config_id: config.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {
            sessionInfoVersion: '3',
          },
        },
      }
    )
  }, [config, finalizeConnection, stopPolling])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-emerald-600">
                WhatsApp Oficial
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                Conectar número pela API oficial da Meta
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                Integre o WhatsApp Business da empresa ao Axion usando o Embedded Signup.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <Building2 className="h-5 w-5 text-zinc-700" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">Business Manager</h3>
              <p className="mt-1 text-sm text-zinc-600">
                O cliente entra com a conta empresarial dele.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <Phone className="h-5 w-5 text-zinc-700" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">Número oficial</h3>
              <p className="mt-1 text-sm text-zinc-600">
                O número fica vinculado ao WABA da empresa.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <Smartphone className="h-5 w-5 text-zinc-700" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">Pronto para uso</h3>
              <p className="mt-1 text-sm text-zinc-600">
                Ao concluir, o Axion salva WABA, phone number ID e token.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <label className="mb-2 block text-sm font-medium text-zinc-800">
              PIN do número
            </label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
            />
          </div>

          {availablePhones.length > 0 && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <label className="mb-2 block text-sm font-medium text-zinc-800">
                Escolha o número para conectar
              </label>

              <select
                value={selectedPhoneId}
                onChange={(e) => setSelectedPhoneId(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
              >
                <option value="">Selecione um número</option>
                {availablePhones.map((phone) => (
                  <option key={phone.id} value={phone.id}>
                    {phone.display_phone_number || phone.id}
                    {phone.verified_name ? ` — ${phone.verified_name}` : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={submitSelectedPhone}
                disabled={busy || !selectedPhoneId}
                className={cn(
                  'mt-3 inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition',
                  !busy && selectedPhoneId
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'cursor-not-allowed bg-zinc-200 text-zinc-500'
                )}
              >
                {busy && status === 'saving' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  'Conectar número selecionado'
                )}
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={openEmbeddedSignup}
              disabled={!canConnect}
              className={cn(
                'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition',
                canConnect
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'cursor-not-allowed bg-zinc-200 text-zinc-500'
              )}
            >
              {busy && (status === 'waiting-meta' || status === 'saving') ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {status === 'saving' ? 'Finalizando...' : 'Aguardando Meta...'}
                </>
              ) : (
                'Conectar com Meta'
              )}
            </button>

            <button
              onClick={loadConfig}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Recarregar
            </button>
          </div>

          {loadingConfig && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando configuração...
            </div>
          )}

          {!loadingConfig && error && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && !error && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              {statusMessage}
            </div>
          )}

          {connection && status === 'success' && (
            <div
              className={cn(
                'mt-6 rounded-2xl p-5',
                isPendingConnection
                  ? 'border border-amber-200 bg-amber-50'
                  : 'border border-emerald-200 bg-emerald-50'
              )}
            >
              <div
                className={cn(
                  'mb-4 flex items-center gap-2',
                  isPendingConnection ? 'text-amber-700' : 'text-emerald-700'
                )}
              >
                {isPendingConnection ? (
                  <Clock3 className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}

                <span className="text-sm font-semibold">
                  {isPendingConnection ? 'Conexão iniciada' : 'Conexão concluída'}
                </span>
              </div>

              {isPendingConnection && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-white/70 px-4 py-3 text-sm text-amber-800">
                  Aguardando confirmação da Meta para vincular o WABA e o número.
                  Assim que o webhook <span className="font-medium">account_update</span> chegar,
                  os dados serão preenchidos automaticamente.
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Número" value={connection.display_phone_number || '—'} />
                <Info label="Nome verificado" value={connection.verified_name || '—'} />
                <Info
                  label="Phone Number ID"
                  value={connection.phone_number_id || '—'}
                  mono
                />
                <Info label="WABA ID" value={connection.waba_id || '—'} mono />
                <Info label="Qualidade" value={connection.quality_rating || '—'} />
                <Info label="Status" value={connection.status || '—'} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-zinc-900">Checklist técnico</p>

          <div className="space-y-3">
            <ChecklistItem done={Boolean(config?.appId)}>META_APP_ID</ChecklistItem>
            <ChecklistItem done={Boolean(config?.configId)}>
              META_EMBEDDED_SIGNUP_CONFIG_ID
            </ChecklistItem>
            <ChecklistItem done={sdkReady}>Facebook SDK carregado</ChecklistItem>
            <ChecklistItem done={isConnected}>Número conectado</ChecklistItem>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Estado atual
            </p>
            <p className="mt-2 text-sm text-zinc-800">
              {status === 'idle' && 'Pronto para iniciar'}
              {status === 'waiting-meta' && 'Aguardando conclusão do Embedded Signup'}
              {status === 'saving' && 'Salvando dados da conexão'}
              {status === 'success' &&
                (isPendingConnection
                  ? 'Conexão iniciada, aguardando confirmação da Meta'
                  : 'Conexão concluída com sucesso')}
              {status === 'error' && 'Erro na conexão'}
            </p>
          </div>

          {config?.ok && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Configuração
              </p>
              <div className="mt-3 space-y-2 text-sm text-zinc-700">
                <div>
                  <span className="font-medium text-zinc-900">App ID:</span> {config.appId}
                </div>
                <div>
                  <span className="font-medium text-zinc-900">Config ID:</span> {config.configId}
                </div>
                <div>
                  <span className="font-medium text-zinc-900">Graph:</span> {config.apiVersion}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-sm text-zinc-900',
          mono && 'break-all font-mono text-xs'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ChecklistItem({
  children,
  done,
}: {
  children: React.ReactNode
  done: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
      <div
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full',
          done ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <span className="text-sm text-zinc-800">{children}</span>
    </div>
  )
}