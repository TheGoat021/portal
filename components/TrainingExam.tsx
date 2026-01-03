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

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    const { data } = await supabase
      .from("training_questions")
      .select("*")
      .eq("module_id", moduleId);

    if (data) setQuestions(data);
  }

  async function finishExam() {
    let correct = 0;

    questions.forEach((q, index) => {
      if (answers[index] === q.correct_index) {
        correct++;
      }
    });

    const percent = Math.round((correct / questions.length) * 100);
    const approved = percent >= 70;

    setScore(percent);
    setFinished(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("training_progress").upsert({
      user_id: user.id,
      module_id: moduleId,
      score: percent,
      approved,
    });
  }

  if (finished) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">
          Resultado: {score}%
        </h2>

        {score! >= 70 ? (
          <p className="text-green-600 font-semibold">
            ✅ Aprovado! Próximo módulo liberado.
          </p>
        ) : (
          <p className="text-red-600 font-semibold">
            ❌ Reprovado. Você pode tentar novamente.
          </p>
        )}

        <button
          onClick={() => {
            setAnswers([]);
            setFinished(false);
            setScore(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Refazer prova
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <p className="font-medium">{i + 1}. {q.question}</p>

          {q.options.map((opt, idx) => (
            <label key={idx} className="block">
              <input
                type="radio"
                name={`q-${i}`}
                onChange={() => {
                  const newAnswers = [...answers];
                  newAnswers[i] = idx;
                  setAnswers(newAnswers);
                }}
              />{" "}
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
