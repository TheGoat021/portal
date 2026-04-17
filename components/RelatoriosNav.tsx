'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Chrome, BadgeDollarSign, Headset } from 'lucide-react'

const items = [
  {
    href: '/portal/relatorios/consolidado',
    label: 'Consolidado',
    icon: BarChart3
  },
  {
    href: '/portal/relatorios/google',
    label: 'Google',
    icon: Chrome
  },
  {
    href: '/portal/relatorios/meta',
    label: 'Meta',
    icon: BadgeDollarSign
  },
  {
    href: '/portal/relatorios/meta-atendimento',
    label: 'Meta Atendimento',
    icon: Headset
  }
]

export default function RelatoriosNav() {
  const pathname = usePathname()

  return (
    <div className="w-full xl:w-auto">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
        {items.map(item => {
          const Icon = item.icon
          const active = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition sm:w-auto',
                active
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
