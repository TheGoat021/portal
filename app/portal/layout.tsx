"use client";

import { Sidebar } from "@/components/Sidebar";

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
    </div>
  );
}
