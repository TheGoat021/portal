// app/portal/integracoes/whatsapp/conectar/page.tsx

import dynamic from 'next/dynamic';

const MetaWhatsAppConnectCard = dynamic(() => import('./MetaWhatsAppConnectCard'), {
  loading: () => (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="h-6 w-48 rounded bg-zinc-200" />
      <div className="mt-3 h-4 w-72 rounded bg-zinc-100" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-2xl bg-zinc-100" />
        <div className="h-28 rounded-2xl bg-zinc-100" />
        <div className="h-28 rounded-2xl bg-zinc-100" />
      </div>
    </div>
  ),
  ssr: false,
});

export default function ConectarWhatsAppPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,255,0.9))] p-4 shadow-[0_16px_36px_rgba(148,163,184,0.08)] md:p-6">
      <MetaWhatsAppConnectCard /> 
    </div>
  );
}
