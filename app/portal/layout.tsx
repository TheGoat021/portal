"use client";

import { Sidebar } from "@/components/Sidebar";
import FloatingSoftphone from "@/components/voice/FloatingSoftphone";
import VoiceSoftphoneBootstrap from "@/components/voice/VoiceSoftphoneBootstrap";
import { usePortalStore } from "@/store/portalStore";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarCollapsed = usePortalStore((state) => state.sidebarCollapsed);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f7f9ff_0%,#f2f6ff_52%,#eef4ff_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-0 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute right-[12%] top-24 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>
      <Sidebar />
      <main
        className={`relative min-w-0 overflow-x-hidden bg-transparent p-6 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          sidebarCollapsed ? "lg:pl-[120px]" : "lg:pl-[344px]"
        }`}
      >
        {children}
      </main>
      <VoiceSoftphoneBootstrap />
      <FloatingSoftphone />
    </div>
  );
}
