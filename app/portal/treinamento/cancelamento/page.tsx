"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTrainingStore } from "@/store/trainingStore";

export default function CancelamentoVideo() {
  const router = useRouter();
  const isUnlocked = useTrainingStore(
    (s) => s.isUnlocked
  );

  // 🔒 Guard de rota (NÃO remove nada)
  useEffect(() => {
    if (!isUnlocked("cancelamento")) {
      router.replace("/portal");
    }
  }, [isUnlocked, router]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Treinamento – Cancelamento
      </h1>

      <iframe
        className="w-full h-[600px] rounded-lg border"
        src="https://drive.google.com/file/d/1yUATWMehbfkF2UTJ_EovxHXYsFySg2B2/preview"
        allow="autoplay"
        allowFullScreen
      />

      <div className="text-right">
        <Link
          href="/portal/treinamento/cancelamento/prova"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded"
        >
          Ir para prova
        </Link>
      </div>
    </div>
  );
}
