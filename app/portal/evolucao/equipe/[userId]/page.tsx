"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

type PerformanceRow = {
  month: number;
  year: number;
  sales_count: number;
  revenue: number;
  commission: number;
  salary: number;
};

export default function EvolucaoUsuarioPage() {
  const { userId } = useParams<{ userId: string }>();

  const [user, setUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userId) return;

      /** 🔹 Usuário (email / setor) */
      const usersRes = await fetch("/api/users");
      const users: User[] = await usersRes.json();
      setUser(users.find((u) => u.id === userId) || null);

      /** 🔹 Dados de evolução (gráficos) */
      const { data: rows, error: perfError } = await supabase
        .from("seller_monthly_performance")
        .select("month, year, sales_count, revenue, commission, salary")
        .eq("user_id", userId)
        .order("year", { ascending: true })
        .order("month", { ascending: true });

      if (perfError) {
        console.error(perfError);
      }

      const formatted =
        rows?.map((row: PerformanceRow) => ({
          periodo: `${String(row.month).padStart(2, "0")}/${row.year}`,
          vendas: row.sales_count,
          faturamento: row.revenue,
          comissao: row.commission,
          salario: row.salary,
        })) || [];

      setData(formatted);

      /** 🔹 Feedback mais recente */
      const { data: fb, error: fbError } = await supabase
        .from("seller_monthly_performance")
        .select("supervisor_score, strengths, improvements")
        .eq("user_id", userId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fbError) {
        console.error(fbError);
      }

      setFeedback(fb ?? null);
      setLoading(false);
    }

    load();
  }, [userId]);

  if (loading) {
    return <div className="p-6">Carregando evolução...</div>;
  }

  if (!user) {
    return <div className="p-6">Usuário não encontrado.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Evolução do Colaborador</h1>

      <div className="grid grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA */}
        <aside className="col-span-12 md:col-span-3 space-y-4">
          <div className="bg-white rounded shadow p-4 text-sm space-y-1">
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Setor:</strong> {user.role}
            </p>
          </div>

          <div className="bg-yellow-200 rounded shadow p-4 text-sm">
            <strong>Nota do Supervisor</strong>
            <p className="text-3xl font-bold mt-2">
              {feedback?.supervisor_score ?? "-"}
            </p>
          </div>

          <div className="bg-green-200 rounded shadow p-4 text-sm">
            <strong>Pontos fortes</strong>
            <p className="mt-2">{feedback?.strengths || "-"}</p>
          </div>

          <div className="bg-red-200 rounded shadow p-4 text-sm">
            <strong>Pontos a melhorar</strong>
            <p className="mt-2">{feedback?.improvements || "-"}</p>
          </div>
        </aside>

        {/* GRÁFICOS */}
        <section className="col-span-12 md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* VENDAS */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Vendas</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="vendas" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* SALÁRIO */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Salário</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Line dataKey="salario" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* FATURAMENTO */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Faturamento</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="faturamento" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* COMISSÃO */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Comissão</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Line dataKey="comissao" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
