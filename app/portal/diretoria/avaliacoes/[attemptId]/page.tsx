"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Attempt = {
  id: string;
  score: number;
  total_questions: number;
  approved: boolean;
  created_at: string;
};

type Answer = {
  id: string;
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
  question: {
    question: string;
    options: string[];
  };
};

export default function AvaliacaoDetalhePage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, []);

  async function loadDetails() {
    setLoading(true);

    /** 1️⃣ Buscar tentativa */
    const { data: attemptData, error: attemptError } = await supabase
      .from("training_exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attemptData) {
      console.error("Erro ao buscar tentativa:", attemptError);
      setLoading(false);
      return;
    }

    setAttempt(attemptData);

    /** 2️⃣ Buscar respostas erradas */
    const { data: answersRaw, error: answersError } = await supabase
      .from("training_exam_answers")
      .select("id, selected_index, correct_index, is_correct, question_id")
      .eq("attempt_id", attemptId)
      .eq("is_correct", false);

    if (answersError || !answersRaw) {
      console.error("Erro ao buscar respostas:", answersError);
      setLoading(false);
      return;
    }

    /** 3️⃣ Buscar perguntas separadamente */
    const questionIds = answersRaw.map((a) => a.question_id);

    const { data: questions, error: questionsError } = await supabase
      .from("training_questions")
      .select("id, question, options")
      .in("id", questionIds);

    if (questionsError || !questions) {
      console.error("Erro ao buscar perguntas:", questionsError);
      setLoading(false);
      return;
    }

    /** 4️⃣ Merge final */
    const merged = answersRaw.map((a) => {
      const q = questions.find((q) => q.id === a.question_id);

      return {
        id: a.id,
        selected_index: a.selected_index,
        correct_index: a.correct_index,
        is_correct: a.is_correct,
        question: q!,
      };
    });

    setAnswers(merged);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-gray-600">Carregando detalhes...</p>;
  }

  if (!attempt) {
    return <p className="text-red-600">Avaliação não encontrada.</p>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="text-blue-600 text-sm"
      >
        ← Voltar
      </button>

      <h1 className="text-2xl font-bold">
        Resultado da Avaliação
      </h1>

      <div className="flex gap-6 text-sm">
        <p>
          <strong>Nota:</strong> {attempt.score}%
        </p>
        <p>
          <strong>Status:</strong>{" "}
          {attempt.approved ? (
            <span className="text-green-600 font-semibold">
              Aprovado
            </span>
          ) : (
            <span className="text-red-600 font-semibold">
              Reprovado
            </span>
          )}
        </p>
        <p>
          <strong>Data:</strong>{" "}
          {new Date(attempt.created_at).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Questões erradas ({answers.length})
        </h2>

        {answers.length === 0 && (
          <p className="text-green-600">
            Nenhuma questão errada 🎉
          </p>
        )}

        {answers.map((a, index) => (
          <div key={a.id} className="border rounded p-4 space-y-2">
            <p className="font-medium">
              {index + 1}. {a.question.question}
            </p>

            <p className="text-sm text-red-600">
              ❌ Marcada: {a.question.options[a.selected_index]}
            </p>

            <p className="text-sm text-green-600">
              ✅ Correta: {a.question.options[a.correct_index]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
