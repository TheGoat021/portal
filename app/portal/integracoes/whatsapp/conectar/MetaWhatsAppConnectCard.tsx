// app/portal/integracoes/whatsapp/conectar/MetaWhatsAppConnectCard.tsx

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Phone,
  ShieldCheck,
  Smartphone,
  Building2,
  RefreshCcw,
  AlertCircle,
} from 'lucide-react';

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: Record<string, any>) => void;
      login: (
        callback: (response: any) => void,
        params: Record<string, any>
      ) => void;
    };
  }
}

type ConfigResponse = {
  ok: boolean;
  appId: string;
  configId: string;
  apiVersion: string;
  error?: string;
};

type EmbeddedMessageData = {
  type?: string;
  event?: string;
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    business_id?: string;
  };
};

type Connection = {
  id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  quality_rating: string | null;
  waba_id: string | null;
  phone_number_id: string | null;
  status: string;
  created_at: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function MetaWhatsAppConnectCard() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting-meta' | 'saving' | 'success' | 'error'>(
    'idle'
  );
  const [error, setError] = useState('');
  const [connection, setConnection] = useState<Connection | null>(null);

  const signupDataRef = useRef<{
    code?: string;
    wabaId?: string;
    phoneNumberId?: string;
    businessId?: string;
    rawEvent?: unknown;
  }>({});

  const canConnect = useMemo(() => {
    return Boolean(config?.ok && sdkReady && !busy);
  }, [config, sdkReady, busy]);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    setError('');

    try {
      const res = await fetch('/api/meta/embedded-signup/config', {
        cache: 'no-store',
      });

      const data = (await res.json()) as ConfigResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao carregar configuração');
      }

      setConfig(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar configuração');
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const finalizeConnection = useCallback(async () => {
    const code = signupDataRef.current.code;
    const wabaId = signupDataRef.current.wabaId;
    const phoneNumberId = signupDataRef.current.phoneNumberId;

    if (!code || !wabaId || !phoneNumberId) {
      return;
    }

    try {
      setBusy(true);
      setStatus('saving');
      setError('');

      const res = await fetch('/api/meta/embedded-signup/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          wabaId,
          phoneNumberId,
          businessId: signupDataRef.current.businessId,
          pin: pin.trim() || undefined,
          rawEvent: signupDataRef.current.rawEvent,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao finalizar conexão');
      }

      setConnection(data.connection);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Erro ao finalizar conexão');
    } finally {
      setBusy(false);
    }
  }, [pin]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!config?.appId) return;

    const existingScript = document.getElementById('facebook-jssdk');
    if (existingScript) {
      setSdkReady(true);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB?.init({
        appId: config.appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: config.apiVersion,
      });
      setSdkReady(true);
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js';

    document.body.appendChild(script);

    return () => {
      window.fbAsyncInit = undefined;
    };
  }, [config]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof event.data !== 'string') return;

      try {
        const parsed = JSON.parse(event.data) as EmbeddedMessageData;

        if (parsed.type !== 'WA_EMBEDDED_SIGNUP') return;

        if (parsed.event === 'FINISH') {
          signupDataRef.current.wabaId = parsed.data?.waba_id;
          signupDataRef.current.phoneNumberId = parsed.data?.phone_number_id;
          signupDataRef.current.businessId = parsed.data?.business_id;
          signupDataRef.current.rawEvent = parsed;

          if (signupDataRef.current.code) {
            void finalizeConnection();
          }
        }

        if (parsed.event === 'ERROR') {
          setBusy(false);
          setStatus('error');
          setError('A Meta retornou um erro durante a conexão.');
        }

        if (parsed.event === 'CANCEL') {
          setBusy(false);
          setStatus('idle');
        }
      } catch {
        return;
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [finalizeConnection]);

  const openEmbeddedSignup = useCallback(() => {
    if (!window.FB || !config?.configId) return;

    setBusy(true);
    setStatus('waiting-meta');
    setError('');
    signupDataRef.current = {};

    window.FB.login(
      (response: any) => {
        if (!response?.authResponse?.code) {
          setBusy(false);
          setStatus('error');
          setError('A Meta não retornou o code do Embedded Signup.');
          return;
        }

        signupDataRef.current.code = response.authResponse.code;

        if (
          signupDataRef.current.wabaId &&
          signupDataRef.current.phoneNumberId
        ) {
          void finalizeConnection();
          return;
        }

        setBusy(false);
        setStatus('waiting-meta');
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
    );
  }, [config, finalizeConnection]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-emerald-600">WhatsApp Oficial</p>
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

          {connection && status === 'success' && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="mb-4 flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-semibold">Conexão concluída</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Número" value={connection.display_phone_number || '—'} />
                <Info label="Nome verificado" value={connection.verified_name || '—'} />
                <Info label="Phone Number ID" value={connection.phone_number_id || '—'} mono />
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
            <ChecklistItem done={Boolean(config?.configId)}>META_EMBEDDED_SIGNUP_CONFIG_ID</ChecklistItem>
            <ChecklistItem done={sdkReady}>Facebook SDK carregado</ChecklistItem>
            <ChecklistItem done={status === 'success'}>Número conectado</ChecklistItem>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Estado atual
            </p>
            <p className="mt-2 text-sm text-zinc-800">
              {status === 'idle' && 'Pronto para iniciar'}
              {status === 'waiting-meta' && 'Aguardando conclusão do Embedded Signup'}
              {status === 'saving' && 'Salvando dados da conexão'}
              {status === 'success' && 'Conexão concluída com sucesso'}
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
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={cn(
          'mt-2 text-sm text-zinc-900',
          mono && 'break-all font-mono text-xs'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ChecklistItem({
  children,
  done,
}: {
  children: React.ReactNode;
  done: boolean;
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
  );
}