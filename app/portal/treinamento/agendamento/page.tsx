"use client";

import { TrainingVideoModule } from "@/components/TrainingVideoModule";

export default function AgendamentoVideo() {
  return (
    <TrainingVideoModule
      moduleKey="agendamento"
      title="Treinamento – Agendamento"
      provaHref="/portal/treinamento/agendamento/prova"
      aulas={[
        {
          id: 1,
          title: "Institucional Doutor de Todos",
          videoUrl:
            "https://drive.google.com/file/d/10RJhIlOS4eIC2fariPL564Zr52uYHbfW/preview",
        },
        {
          id: 1,
          title: "Principais concorrentes",
          videoUrl:
            "https://drive.google.com/file/d/1CzV3MMuFuEZj1lFYFu2_4UD7be4qjCKU/preview",
        },
        {
          id: 1,
          title: "Sistemas e como eles funcionam",
          videoUrl:
            "https://drive.google.com/file/d/18Nyj7APlrKgWh4Czcl5Mr7NCm0Lio-2I/preview",
        },
        {
          id: 1,
          title: "Passo a passo agendamento",
          videoUrl:
            "https://drive.google.com/file/d/1KjDZ3NMUBJZ5B_SvXzeKNKZ1hFCKSzVq/preview",
        },
      ]}
    />
  );
}
