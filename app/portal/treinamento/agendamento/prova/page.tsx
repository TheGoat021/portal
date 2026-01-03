"use client";

import { TrainingExam } from "@/components/TrainingExam";

export default function TesteProvaPage() {
  // ⚠️ coloque aqui o module_id REAL do Agendamento
  const AGENDAMENTO_ID = "e78eadb3-162a-4fe9-831a-4c2819a6b84d";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Teste da Prova – Agendamento
      </h1>

      <TrainingExam moduleId={AGENDAMENTO_ID} />
    </div>
  );
}
