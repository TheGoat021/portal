import { create } from "zustand";

type PortalState = {
  activeHref: string | null;
  sidebarCollapsed: boolean;
  setActiveHref: (href: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

export const usePortalStore = create<PortalState>((set) => ({
  activeHref: null,
  sidebarCollapsed: true,
  setActiveHref: (href) => set({ activeHref: href }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
