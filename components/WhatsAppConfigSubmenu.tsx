"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Conexao Whats", href: "/portal/whatsapp" },
  { label: "Fila Whats Meta", href: "/portal/integracoes/whatsapp/fila" },
  { label: "Chatbot Whats Meta", href: "/portal/integracoes/whatsapp/chatbot" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WhatsAppConfigSubmenu() {
  const pathname = usePathname();

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(245,249,255,0.66))] p-4 shadow-[0_24px_60px_rgba(148,163,184,0.12)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-violet-200/24 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-36 w-52 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold backdrop-blur-xl transition",
                active
                  ? "border border-cyan-200/80 bg-[linear-gradient(135deg,rgba(96,165,250,0.94),rgba(34,211,238,0.9),rgba(167,139,250,0.84))] text-white shadow-[0_18px_32px_rgba(96,165,250,0.24)]"
                  : "border border-white/70 bg-white/64 text-slate-700 shadow-[0_8px_24px_rgba(148,163,184,0.08)] hover:bg-white/86",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
