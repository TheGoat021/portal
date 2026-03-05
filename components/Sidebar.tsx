"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import { menuConfig } from "@/config/menu";
import { usePortalStore } from "@/store/portalStore";
import { useTrainingStore } from "@/store/trainingStore";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/authStore";

export function Sidebar() {
  const { role } = useAuth();
  const router = useRouter();

  const setActiveHref = usePortalStore((state) => state.setActiveHref);
  const { setProgress, isUnlocked, progress } = useTrainingStore();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: progressData } = await supabase
        .from("training_progress")
        .select("module_id, approved")
        .eq("user_id", user.id);

      if (!progressData) return;

      const { data: modules } = await supabase
        .from("training_modules")
        .select("id, slug");

      const normalized = progressData
        .map((p) => {
          const mod = modules?.find((m) => m.id === p.module_id);
          if (!mod) return null;
          return { module: mod.slug, approved: p.approved };
        })
        .filter(Boolean);

      setProgress(normalized as any);
    }

    loadProgress();
  }, [setProgress]);

  function toggleSection(title: string) {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }

  function handleClick(href?: string, locked?: boolean) {
    if (!href || locked) return;

    if (href.startsWith("http")) {
      router.push("/portal");
      setTimeout(() => {
        setActiveHref(href);
      }, 0);
      return;
    }

    setActiveHref(null);
    router.push(href);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setActiveHref(null);
    router.replace("/login");
  }

  return (
    <aside
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className={`bg-slate-900 text-white p-4 flex flex-col transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex flex-col items-center text-center mb-8 mt-6">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
          <LayoutDashboard size={24} />
        </div>

        {!collapsed && (
          <>
            <p className="text-sm text-gray-300">Bem-vindo ao</p>
            <p className="text-xs text-gray-400">Portal Interno</p>
          </>
        )}
      </div>

      {/* Menu */}
      <div className="flex-1 space-y-5 overflow-y-auto">
        {menuConfig
          .filter((section) => !section.roles || section.roles.includes(role!))
          .map((section, index) => {
            const key = section.title ?? `section-${index}`;
            const isOpen = openSections[key];
            const Icon = section.icon;

            return (
              <div key={key}>
                {/* SECTION TITLE */}
                {section.title && !collapsed && (
                  <button
                    onClick={() => toggleSection(section.title!)}
                    className="w-full flex items-center justify-between text-xs uppercase text-gray-400 mb-2 hover:text-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      {Icon && <Icon size={14} />}
                      <span>{section.title}</span>
                    </div>

                    {isOpen ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                )}

                {/* SECTION ICON (quando retraída) */}
                {collapsed && Icon && (
                  <div className="flex justify-center py-2 text-gray-400">
                    <Icon size={18} />
                  </div>
                )}

                {/* ITEMS */}
                {(section.title ? isOpen : true) && !collapsed && (
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const isTrainingItem = "module" in item;

                      const current = isTrainingItem
                        ? progress.find((p) => p.module === item.module)
                        : null;

                      const approved = current?.approved === true;

                     const locked =
  isTrainingItem &&
  !approved &&
  item.module !== undefined &&
  !isUnlocked(item.module);

                      return (
                        <li key={item.label}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleClick(item.href, locked)}
                              disabled={locked}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800 ${
                                locked ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              {/* sem ícone nos submenus */}
                              <span className="flex-1 text-left">
                                {item.label}
                              </span>

                              {approved && <span>✔️</span>}
                              {locked && <span>🔒</span>}
                            </button>

                            {"allowExternal" in item &&
                              item.allowExternal &&
                              item.href && (
                                <a
                                  href={item.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-slate-400 hover:text-white pr-2"
                                  title="Abrir em nova guia"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mt-6 flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800 text-sm"
      >
        <LogOut size={16} />
        {!collapsed && <span>Logout</span>}
      </button>
    </aside>
  );
}