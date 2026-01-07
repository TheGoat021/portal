"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
};

export function TrainingExam({ moduleId }: { moduleId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    const { data } = await supabase
      .from("training_questions")
      .select("*")
      .eq("module_id", moduleId);

    setQuestions(data || []);
  }

  async function finishExam() {
    let correct = 0;

    questions.forEach((q, index) => {
      if (answers[index] === q.correct_index) {
        correct++;
      }
    });

    const percent = Math.round(
      (correct / questions.length) * 100
    );
    const isApproved = percent >= 70;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Usuário não autenticado");
      return;
    }

    // ===============================
    // 🔹 SNAPSHOT DAS RESPOSTAS (JSON)
    // ===============================
    const answersSnapshot = questions.map((q, index) => ({
      question_id: q.id,
      selected_index: answers[index],
      correct_index: q.correct_index,
      is_correct: answers[index] === q.correct_index,
    }));

    // ===============================
    // 1️⃣ INSERT DA TENTATIVA
    // ===============================
    const { error: insertError } = await supabase
      .from("training_exam_attempts")
      .insert([
        {
          user_id: user.id,
          module_id: moduleId,
          score: percent,
          total_questions: questions.length,
          approved: isApproved,
          answers: answersSnapshot, // ✅ OBRIGATÓRIO
        },
      ]);

    if (insertError) {
      console.error("Erro ao salvar tentativa:", insertError);
      return;
    }

    // ===============================
    // 2️⃣ BUSCA A TENTATIVA CRIADA
    // ===============================
    const { data: attempt } = await supabase
      .from("training_exam_attempts")
      .select("id")
      .eq("user_id", user.id)
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!attempt) {
      console.error("Tentativa não encontrada");
      return;
    }

    // ===============================
    // 3️⃣ SALVA RESPOSTAS NORMALIZADAS
    // ===============================
    const normalizedAnswers = answersSnapshot.map((a) => ({
      attempt_id: attempt.id,
      question_id: a.question_id,
      selected_index: a.selected_index,
      correct_index: a.correct_index,
      is_correct: a.is_correct,
    }));

    await supabase
      .from("training_exam_answers")
      .insert(normalizedAnswers);

    // ===============================
    // 4️⃣ ATUALIZA PROGRESSO
    // ===============================
    await supabase.from("training_progress").upsert({
      user_id: user.id,
      module_id: moduleId,
      score: percent,
      approved: isApproved,
    });

    // ===============================
    // 5️⃣ UI
    // ===============================
    setScore(percent);
    setApproved(isApproved);
    setFinished(true);
  }

  if (finished) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">
          Resultado: {score}%
        </h2>

        {approved ? (
          <p className="text-green-600 font-semibold">
            ✅ Aprovado!
          </p>
        ) : (
          <p className="text-red-600 font-semibold">
            ❌ Reprovado.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id}>
          <p className="font-medium">
            {i + 1}. {q.question}
          </p>

          {q.options.map((opt, idx) => (
            <label key={idx} className="block">
              <input
                type="radio"
                name={`q-${i}`}
                onChange={() => {
                  const a = [...answers];
                  a[i] = idx;
                  setAnswers(a);
                }}
                className="mr-2"
              />
              {opt}
            </label>
          ))}
        </div>
      ))}

      <button
        onClick={finishExam}
        className="px-6 py-2 bg-green-600 text-white rounded"
      >
        Finalizar prova
      </button>
    </div>
  );
}
