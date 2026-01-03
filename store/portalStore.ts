import { create } from "zustand";

type PortalState = {
  activeHref: string | null;
  setActiveHref: (href: string | null) => void;
};

export const usePortalStore = create<PortalState>((set) => ({
  activeHref: null,
  setActiveHref: (href) => set({ activeHref: href }),
}));
