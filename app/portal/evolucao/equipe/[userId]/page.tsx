"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type User = {
  id: string;
  email: string;
  role: string;
};

type Feedback = {
  supervisor_score: number | null;
  strengths: string | null;
  improvements: string | null;
};

export default function EvolucaoUsuarioPage() {
  const { userId } = useParams<{ userId: string }>();

  const [user, setUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userId) return;

      const res = await fetch("/api/users");
      const users: User[] = await res.json();
      setUser(users.find((u) => u.id === userId) || null);

      const { data } = await supabase
        .from("seller_monthly_performance")
        .select("supervisor_score, strengths, improvements")
        .eq("user_id", userId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .single();

      setFeedback(data ?? null);
      setLoading(false);
    }

    load();
  }, [userId]);

  if (loading) return <div className="p-6">Carregando evolução...</div>;

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* MESMO JSX da página Minha Evolução */}
    </div>
  );
}
