"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
};

// ✅ FUNÇÃO UTILITÁRIA (APENAS ADICIONADA)
function shuffleOptions(options: string[]) {
  const mapped = options.map((option, index) => ({
    text: option,
    originalIndex: index,
  }));

  for (let i = mapped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
  }

  return mapped;
}

export function TrainingExam({ moduleId }: { moduleId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [approved, setApproved] = useState(false);

  // ✅ STATE ADICIONADO (SEM AFETAR O RESTO)
  const [shuffledOptions, setShuffledOptions] = useState<
    Record<string, { text: string; originalIndex: number }[]>
  >({});

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    const { data } = await supabase
      .from("training_questions")
      .select("*")
      .eq("module_id", moduleId);

    setQuestions(data || []);

    // ✅ EMBARALHA UMA VEZ POR QUESTÃO
    const map: Record<
      string,
      { text: string; originalIndex: number }[]
    > = {};

    (data || []).forEach((q: Question) => {
      map[q.id] = shuffleOptions(q.options);
    });

    setShuffledOptions(map);
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

    const answersSnapshot = questions.map((q, index) => ({
      question_id: q.id,
      selected_index: answers[index],
      correct_index: q.correct_index,
      is_correct: answers[index] === q.correct_index,
    }));

    const { error: insertError } = await supabase
      .from("training_exam_attempts")
      .insert([
        {
          user_id: user.id,
          module_id: moduleId,
          score: percent,
          total_questions: questions.length,
          approved: isApproved,
          answers: answersSnapshot,
        },
      ]);

    if (insertError) {
      console.error("Erro ao salvar tentativa:", insertError);
      return;
    }

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

    await supabase.from("training_progress").upsert({
      user_id: user.id,
      module_id: moduleId,
      score: percent,
      approved: isApproved,
    });

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

          {shuffledOptions[q.id]?.map((opt, idx) => (
            <label key={idx} className="block">
              <input
                type="radio"
                name={`q-${i}`}
                onChange={() => {
                  const a = [...answers];
                  a[i] = opt.originalIndex; // ✅ ÍNDICE ORIGINAL
                  setAnswers(a);
                }}
                className="mr-2"
              />
              {opt.text}
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
