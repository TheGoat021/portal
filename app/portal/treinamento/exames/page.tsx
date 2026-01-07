"use client";

import { TrainingVideoModule } from "@/components/TrainingVideoModule";

export default function ExamesVideo() {
  return (
    <TrainingVideoModule
      moduleKey="exames"
      title="Treinamento – Exames"
      provaHref="/portal/treinamento/exames/prova"
      aulas={[
        {
          id: 1,
          title: "Introdução aos Exames",
          videoUrl:
            "https://drive.google.com/file/d/1PFE13Nl9za3HojPM44cuit2_P1t6_KJV/preview",
        },
      ]}
    />
  );
}
