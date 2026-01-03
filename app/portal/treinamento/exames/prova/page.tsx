"use client";

import { TrainingExam } from "@/components/TrainingExam";

export default function TesteProvaPage() {
  // ⚠️ coloque aqui o module_id REAL do Exames
  const EXAMES_ID = "5a5d4bed-9d48-4102-9a95-e341cff9ab16";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Teste da Prova – Exames
      </h1>

      <TrainingExam moduleId={EXAMES_ID} />
    </div>
  );
}
