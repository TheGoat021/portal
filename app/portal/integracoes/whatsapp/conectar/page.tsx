// app/portal/integracoes/whatsapp/conectar/page.tsx

import MetaWhatsAppConnectCard from './MetaWhatsAppConnectCard';

export default function ConectarWhatsAppPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(245,249,255,0.7))] p-4 shadow-[0_20px_48px_rgba(148,163,184,0.1)] backdrop-blur-xl md:p-6">
      <MetaWhatsAppConnectCard /> 
    </div>
  );
}
