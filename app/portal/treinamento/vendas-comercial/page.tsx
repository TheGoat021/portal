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
          title: "Introdução Comercial",
          videoUrl:
            "https://drive.google.com/file/d/1cpttzOUYFMlBWaE5UsTH70tQjlw8HM8o/preview",
        },
      ]}
    />
  );
}
