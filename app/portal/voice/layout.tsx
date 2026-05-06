"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Headset, History } from "lucide-react"

const voiceTabs = [
  {
    href: "/portal/voice/queues",
    label: "Filas",
    description: "Monitoramento de fila e SLA",
    icon: BarChart3
  },
  {
    href: "/portal/voice/agents",
    label: "Ramais",
    description: "Status e operacao dos agentes",
    icon: Headset
  },
  {
    href: "/portal/voice/calls",
    label: "Historico",
    description: "Consulta de chamadas e gravacoes",
    icon: History
  }
]

export default function VoiceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-3 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.18)]">
        <div className="grid gap-3 lg:grid-cols-3">
          {voiceTabs.map((tab) => {
            const active = pathname === tab.href
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-[18px] border px-4 py-4 transition ${
                  active
                    ? "border-slate-900 bg-slate-950 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.6)]"
                    : "border-[#E5E7EB] bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-2xl p-2 ${
                      active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{tab.label}</p>
                    <p className={`text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
                      {tab.description}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {children}
    </div>
  )
}
