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
          title: "Introdução ao Agendamento",
          videoUrl:
            "https://drive.google.com/file/d/1fCTRHI1oge1H-t8E2woJOhcl8tOK2MRT/preview",
        },
        {
          id: 1,
          title: "Teste 2",
          videoUrl:
            "https://drive.google.com/file/d/1J4KSkts-CP7HCMQkuJbL3h2QGFvNW2c0/preview",
        },
      ]}
    />
  );
}
