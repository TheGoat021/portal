"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/store/authStore";
import { useRouter } from "next/navigation";

type ExamAttempt = {
  id: string;
  user_id: string;
  module_id: string;
  score: number;
  total_questions: number;
  approved: boolean;
  created_at: string;
};

type Profile = {
  id: string;
  email: string;
};

type ExamResult = {
  id: string;
  collaborator: string;
  module: string;
  score: number;
  approved: boolean;
  created_at: string;
};

export default function AvaliacoesDiretoriaPage() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  const { role } = useAuth();
  const router = useRouter();

  // 🔒 Guard DIRETORIA
  useEffect(() => {
    if (role !== "DIRETORIA") {
      router.replace("/portal");
    }
  }, [role, router]);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    setLoading(true);

    /** 1️⃣ Buscar tentativas */
    const { data: attempts, error: attemptsError } = await supabase
      .from("training_exam_attempts")
      .select("*")
      .order("created_at", { ascending: false });

    if (attemptsError || !attempts) {
      console.error("Erro ao buscar tentativas:", attemptsError);
      setLoading(false);
      return;
    }

    /** 2️⃣ Buscar perfis dos usuários */
    const userIds = [...new Set(attempts.map(a => a.user_id))];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (profilesError || !profiles) {
      console.error("Erro ao buscar perfis:", profilesError);
      setLoading(false);
      return;
    }

    const profileMap = new Map<string, Profile>();
    profiles.forEach(p => profileMap.set(p.id, p));

    /** 3️⃣ Montar dados finais */
    const formatted: ExamResult[] = attempts.map((a: ExamAttempt) => ({
      id: a.id,
      collaborator: profileMap.get(a.user_id)?.email ?? "—",
      module: a.module_id, // UUID (você pode mapear depois)
      score: a.score,
      approved: a.approved,
      created_at: a.created_at,
    }));

    setResults(formatted);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-gray-600">Carregando avaliações...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Avaliações dos Colaboradores
      </h1>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Colaborador</th>
              <th className="px-4 py-2">Módulo</th>
              <th className="px-4 py-2">Nota</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>

          <tbody>
            {results.map(r => (
              <tr
                key={r.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() =>
                  router.push(`/portal/diretoria/avaliacoes/${r.id}`)
                }
              >
                <td className="px-4 py-2">{r.collaborator}</td>
                <td className="px-4 py-2">{r.module}</td>
                <td className="px-4 py-2 font-medium">{r.score}%</td>
                <td className="px-4 py-2">
                  {r.approved ? (
                    <span className="text-green-600 font-semibold">
                      Aprovado
                    </span>
                  ) : (
                    <span className="text-red-600 font-semibold">
                      Reprovado
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-blue-600 text-sm">
                  Ver erros da prova
                </td>
              </tr>
            ))}

            {results.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  Nenhuma avaliação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
