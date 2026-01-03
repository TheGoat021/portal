import { create } from "zustand";

type TrainingProgress = {
  module: string;
  approved: boolean;
};

type TrainingStore = {
  progress: TrainingProgress[];
  setProgress: (data: TrainingProgress[]) => void;
  isUnlocked: (module: string) => boolean;
};

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  progress: [],

  setProgress: (data) => set({ progress: data }),

  isUnlocked: (module) => {
  const order = [
    "agendamento",
    "vendas-comercial",
    "exames",
    "cancelamento",
  ];

  const index = order.indexOf(module);

  console.log("🧩 módulo atual:", module);
  console.log("📍 index:", index);
  console.log("📦 progresso:", get().progress);

  if (index === 0) return true;

  const previous = order[index - 1];

  const result = get().progress.some(
    (p) => p.module === previous && p.approved
  );

  console.log("🔓 pode liberar?", result);

  return result;
},
}));
