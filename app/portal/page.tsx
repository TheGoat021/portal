"use client";

import { DashboardCard } from "@/components/DashboardCard";
import { PortalContent } from "@/components/PortalContent";
import { useAuth } from "@/store/authStore";
import { usePortalStore } from "@/store/portalStore";

export default function PortalPage() {
  const { role } = useAuth();
  const { activeHref, setActiveHref } = usePortalStore();

  return (
    <main className="flex-1 p-6 bg-gray-100 space-y-6">
      {!activeHref && (
        <>
          <div>
            <h1 className="text-2xl font-bold">Bem-vindo ao Portal</h1>
            <p className="text-gray-600">
              Perfil ativo: <strong>{role}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {role === "DIRETORIA" && (
              <>
                <DashboardCard title="Relatórios" />
                <DashboardCard title="Financeiro" />
                <DashboardCard title="Campanhas" />
              </>
            )}
          </div>
        </>
      )}

      {activeHref && (
        <PortalContent
          href={activeHref}
          onBack={() => setActiveHref(null)}
        />
      )}
    </main>
  );
}
