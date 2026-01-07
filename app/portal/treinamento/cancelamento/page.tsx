"use client";

import { TrainingVideoModule } from "@/components/TrainingVideoModule";

export default function CancelamentoVideo() {
  return (
    <TrainingVideoModule
      moduleKey="cancelamento"
      title="Treinamento – Cancelamento"
      provaHref="/portal/treinamento/cancelamento/prova"
      aulas={[
        {
          id: 1,
          title: "Introdução ao Cancelamento",
          videoUrl:
            "https://drive.google.com/file/d/1yUATWMehbfkF2UTJ_EovxHXYsFySg2B2/preview",
        },
      ]}
    />
  );
}
