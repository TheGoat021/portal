// app/portal/integracoes/whatsapp/conectar/page.tsx

import MetaWhatsAppConnectCard from './MetaWhatsAppConnectCard';
import Link from "next/link";

export default function ConectarWhatsAppPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-white p-4 md:p-6 space-y-4">
      <MetaWhatsAppConnectCard />

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm md:text-base font-semibold text-gray-900">Chatbot de Triagem (Fluxograma)</h2>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Monte e publique o fluxo de perguntas e direcionamento no estilo Node-RED.
          </p>
        </div>

        <Link
          href="/portal/integracoes/whatsapp/chatbot"
          className="shrink-0 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm hover:bg-black transition"
        >
          Abrir construtor
        </Link>
      </div>
    </div>
  );
}
