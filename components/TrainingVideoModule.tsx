"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrainingStore } from "@/store/trainingStore";

type Aula = {
  id: number;
  title: string;
  videoUrl: string;
};

type Props = {
  moduleKey: string;
  title: string;
  aulas: Aula[];
  provaHref: string;
};

export function TrainingVideoModule({
  moduleKey,
  title,
  aulas,
  provaHref,
}: Props) {
  const router = useRouter();
  const isUnlocked = useTrainingStore((s) => s.isUnlocked);

  const [aulaAtual, setAulaAtual] = useState(0);

  // 🔒 Guard de rota (mantido)
  useEffect(() => {
    if (!isUnlocked(moduleKey)) {
      router.replace("/portal");
    }
  }, [isUnlocked, router, moduleKey]);

  const aula = aulas[aulaAtual];
  const isUltimaAula = aulaAtual === aulas.length - 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-500">
          Aula {aulaAtual + 1} de {aulas.length} — {aula.title}
        </p>
      </div>

      <iframe
        key={aula.id}
        className="w-full h-[600px] rounded-lg border"
        src={aula.videoUrl}
        allow="autoplay"
        allowFullScreen
      />

      <div className="flex justify-between">
        <button
          disabled={aulaAtual === 0}
          onClick={() => setAulaAtual((prev) => prev - 1)}
          className="px-4 py-2 rounded bg-gray-200 disabled:opacity-50"
        >
          Aula anterior
        </button>

        {!isUltimaAula ? (
          <button
            onClick={() => setAulaAtual((prev) => prev + 1)}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Próxima aula
          </button>
        ) : (
          <Link
            href={provaHref}
            className="px-6 py-2 rounded bg-green-600 text-white"
          >
            Ir para prova
          </Link>
        )}
      </div>
    </div>
  );
}
