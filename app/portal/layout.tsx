"use client";

import { Sidebar } from "@/components/Sidebar";
import FloatingSoftphone from "@/components/voice/FloatingSoftphone";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden bg-gray-100 p-6">
        {children}
      </main>
      <FloatingSoftphone />
    </div>
  );
}
