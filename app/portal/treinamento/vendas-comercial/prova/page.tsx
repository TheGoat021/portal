"use client";

import { TrainingExam } from "@/components/TrainingExam";

export default function TesteProvaPage() {
  // ⚠️ coloque aqui o module_id REAL do Vendas-comercial
  const COMERCIAL_ID = "0a751cc6-497f-4a3b-bb2b-8a70f901bda9";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Teste da Prova – Comercial
      </h1>

      <TrainingExam moduleId={COMERCIAL_ID} />
    </div>
  );
}
