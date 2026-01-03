"use client";

import { TrainingExam } from "@/components/TrainingExam";

export default function TesteProvaPage() {
  // ⚠️ coloque aqui o module_id REAL do Cancelamento
  const CANCELAMENTO_ID = "06f0e4e4-e493-4c5c-afd2-fbd7f9ad64c3";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Teste da Prova – Cancelamento
      </h1>

      <TrainingExam moduleId={CANCELAMENTO_ID} />
    </div>
  );
}
