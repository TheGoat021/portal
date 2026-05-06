"use client"

import { ReactNode } from "react"

type KPIItem = {
  label: string
  value: string
  hint: string
  icon: ReactNode
}

export default function KPIHeader({
  title,
  description,
  items
}: {
  title: string
  description: string
  items: KPIItem[]
}) {
  return (
    <section className="space-y-5">
      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
              Axion Voice
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {item.value}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-600">{item.icon}</div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">{item.hint}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
