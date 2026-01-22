"use client";

import { TrainingVideoModule } from "@/components/TrainingVideoModule";

export default function ComercialVideo() {
  return (
    <TrainingVideoModule
      moduleKey="vendas-comercial"
      title="Treinamento – Comercial Vendas"
      provaHref="/portal/treinamento/vendas-comercial/prova"
      aulas={[
        {
          id: 1,
          title: "Comercial script e os 3 pilares",
          videoUrl:
            "https://drive.google.com/file/d/1sZkCPIx4tth-3vBv8DjObuLwVYLOSalk/preview",
        },
      ]}
    />
  );
}
