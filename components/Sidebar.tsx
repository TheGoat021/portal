"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";

import { menuConfig } from "@/config/menu";
import { usePortalStore } from "@/store/portalStore";
import { useTrainingStore } from "@/store/trainingStore";
import { supabase } from "@/lib/supabaseClient";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/store/authStore";

type TrainingProgressItem = {
  module: string;
  approved: boolean;
};

export function Sidebar() {
  const { role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const collapsed = usePortalStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = usePortalStore((state) => state.setSidebarCollapsed);
  const setActiveHref = usePortalStore((state) => state.setActiveHref);
  const { setProgress, isUnlocked, progress } = useTrainingStore();

  const visibleSections = useMemo(
    () => menuConfig.filter((section) => !section.roles || section.roles.includes(role!)),
    [role],
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadProgress() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) return;

      const { data: progressData } = await supabase
        .from("training_progress")
        .select("module_id, approved")
        .eq("user_id", currentUser.id);

      if (!progressData) return;

      const { data: modules } = await supabase.from("training_modules").select("id, slug");

      const normalized: TrainingProgressItem[] = progressData
        .map((item) => {
          const moduleData = modules?.find((module) => module.id === item.module_id);
          if (!moduleData) return null;
          return { module: moduleData.slug, approved: item.approved };
        })
        .filter((item): item is TrainingProgressItem => Boolean(item));

      setProgress(normalized);
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

  function isActiveRoute(href?: string) {
    if (!href || href.startsWith("http")) return false;
    const [targetPath, targetQuery] = href.split("?");

    if (targetPath === "/portal") return pathname === "/portal";
    if (pathname !== targetPath && !pathname.startsWith(`${targetPath}/`)) return false;
    if (!targetQuery) return true;

    const targetParams = new URLSearchParams(targetQuery);
    return Array.from(targetParams.entries()).every(
      ([key, value]) => searchParams.get(key) === value,
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setActiveHref(null);
    router.replace("/login");
  }

  return (
    <aside
      onMouseEnter={() => setSidebarCollapsed(false)}
      onMouseLeave={() => setSidebarCollapsed(true)}
      className={`fixed left-0 top-0 z-40 hidden h-screen border-r border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(247,249,255,0.9)_48%,rgba(241,246,255,0.96)_100%)] px-4 py-5 text-slate-700 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex ${
        collapsed ? "lg:w-[96px]" : "lg:w-[320px]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-10 h-44 w-44 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="absolute right-0 top-24 h-52 w-52 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute bottom-16 left-8 h-40 w-40 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/0 via-white/80 to-white/0" />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-40px)] w-full flex-col rounded-[30px] border border-white/55 bg-white/45 p-4 shadow-[0_16px_50px_rgba(147,163,184,0.14)] backdrop-blur-2xl">
        <div className={`shrink-0 px-2 pt-1 transition-all duration-500 ${collapsed ? "flex justify-center" : ""}`}>
          <div className={`flex items-center transition-all duration-500 ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.95),rgba(255,255,255,0.25)),linear-gradient(135deg,rgba(126,92,255,0.92),rgba(67,198,255,0.78),rgba(116,244,204,0.72))] shadow-[0_12px_35px_rgba(99,102,241,0.18)]">
              <div className="h-5 w-5 rotate-45 rounded-[6px] bg-white/90" />
            </div>
            {!collapsed ? (
              <div className="animate-in fade-in duration-300">
                <p className="text-[26px] font-semibold tracking-[-0.03em] text-slate-900">Axion</p>
                <p className="text-xs text-slate-500">Workspace · Portal Interno</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <div className="rounded-[24px] border border-white/70 bg-white/52 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="space-y-1.5">
              {visibleSections.map((section, index) => {
                const key = section.title ?? `section-${index}`;
                const isRootSection = !section.title;
                const sectionHasActiveItem = section.items.some((item) => isActiveRoute(item.href));
                const isOpen = isRootSection
                  ? true
                  : openSections[key] ?? (sectionHasActiveItem || index === 1);
                const SectionIcon = index === 0 ? Sparkles : section.icon;

                return (
                  <div key={key} className="rounded-[20px]">
                    {section.title && !collapsed ? (
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title!)}
                        className={`flex w-full items-center justify-between rounded-[18px] px-3 py-2.5 text-left transition ${
                          sectionHasActiveItem
                            ? "bg-white/65 text-slate-900 shadow-[0_8px_24px_rgba(255,255,255,0.24)]"
                            : "text-slate-500 hover:bg-white/40 hover:text-slate-800"
                        }`}
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                          {section.title}
                        </span>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    ) : null}

                    {collapsed ? (
                      <ul className="space-y-1">
                        <li>
                          <div className="group/tooltip relative flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleClick(section.items[0]?.href, false)}
                              className={`flex w-full items-center justify-center rounded-[18px] border px-3 py-3 transition-all duration-300 ${
                                sectionHasActiveItem
                                  ? "border-cyan-100/90 bg-[linear-gradient(135deg,rgba(216,248,248,0.95),rgba(243,250,255,0.95))] text-teal-700 shadow-[0_10px_30px_rgba(103,232,249,0.18)]"
                                  : "border-transparent bg-transparent text-slate-600 hover:border-white/70 hover:bg-white/55 hover:text-slate-900"
                              }`}
                              title={section.title ?? section.items[0]?.label}
                            >
                              {SectionIcon ? <SectionIcon size={16} /> : <Sparkles size={16} />}
                            </button>
                            <div className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/70 bg-white/88 px-3 py-2 text-xs font-medium text-slate-700 opacity-0 shadow-[0_12px_32px_rgba(148,163,184,0.18)] backdrop-blur-xl transition-all duration-200 group-hover/tooltip:translate-x-0 group-hover/tooltip:opacity-100">
                              {section.title ?? section.items[0]?.label}
                            </div>
                          </div>
                        </li>
                      </ul>
                    ) : isOpen ? (
                      <ul className={`${section.title ? "mt-2" : ""} space-y-1`}>
                        {section.items.map((item, itemIndex) => {
                          const isTrainingItem = "module" in item;
                          const current = isTrainingItem
                            ? progress.find((progressItem) => progressItem.module === item.module)
                            : null;
                          const approved = current?.approved === true;
                          const locked =
                            isTrainingItem &&
                            !approved &&
                            item.module !== undefined &&
                            !isUnlocked(item.module);
                          const isActive = isActiveRoute(item.href);
                          const isExternal = Boolean(
                            "allowExternal" in item && item.allowExternal && item.href,
                          );
                          const Icon = index === 0 && itemIndex === 0 ? Sparkles : section.icon;

                          return (
                            <li key={item.label}>
                              <div className="group flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleClick(item.href, locked)}
                                  disabled={locked}
                                className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition-all duration-300 ${
                                  isActive
                                    ? "border-cyan-100/90 bg-[linear-gradient(135deg,rgba(216,248,248,0.95),rgba(243,250,255,0.95))] text-teal-700 shadow-[0_10px_30px_rgba(103,232,249,0.18)]"
                                    : locked
                                        ? "border-transparent bg-white/20 text-slate-400 opacity-60"
                                        : "border-transparent bg-transparent text-slate-700 hover:border-white/70 hover:bg-white/55 hover:text-slate-900"
                                  }`}
                                >
                                  <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${
                                      isActive
                                        ? "border-white/80 bg-white/75 text-teal-600"
                                        : "border-white/55 bg-white/45 text-slate-500"
                                    }`}
                                  >
                                    {Icon ? (
                                      <Icon size={15} />
                                    ) : (
                                      <span className="h-2 w-2 rounded-full bg-current/70" />
                                    )}
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">
                                      {item.label}
                                    </span>
                                    {approved ? (
                                      <span className="block text-xs text-emerald-600">
                                        Concluído
                                      </span>
                                    ) : locked ? (
                                      <span className="block text-xs text-slate-400">
                                        Bloqueado
                                      </span>
                                    ) : null}
                                  </span>
                                </button>

                                {isExternal ? (
                                  <a
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(event) => event.stopPropagation()}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-white/35 text-slate-400 transition-all duration-300 hover:border-white/70 hover:bg-white/65 hover:text-slate-700"
                                    title="Abrir em nova guia"
                                  >
                                    <ArrowUpRight size={16} />
                                  </a>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 shrink-0 border-t border-white/45 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center rounded-[20px] border border-white/70 bg-white/58 py-3 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-300 hover:bg-white/80 hover:text-slate-900 ${
              collapsed ? "justify-center px-3" : "justify-center gap-2 px-4"
            }`}
            title="Sair"
          >
            <LogOut size={16} />
            {!collapsed ? <span>Sair</span> : null}
          </button>
        </div>
      </div>
    </aside>
  );
}
