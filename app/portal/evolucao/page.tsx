"use client";

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
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PerformanceRow = {
  month: number;
  year: number;
  sales_count: number;
  revenue: number;
  commission: number;
  salary: number;
};

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

export default function EvolucaoPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      /** 🔐 usuário logado */
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      /** 👤 dados do usuário (mesmo padrão do sistema) */
      const res = await fetch("/api/users");
      const users: User[] = await res.json();
      const currentUser = users.find((u) => u.id === user.id) || null;
      setUserInfo(currentUser);

      /** 📊 dados dos gráficos */
      const { data: rows, error } = await supabase
        .from("seller_monthly_performance")
        .select("month, year, sales_count, revenue, commission, salary")
        .eq("user_id", user.id)
        .order("year", { ascending: true })
        .order("month", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
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

      /** ⭐ feedback mais recente */
      const { data: lastFeedback } = await supabase
        .from("seller_monthly_performance")
        .select("supervisor_score, strengths, improvements")
        .eq("user_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .single();

      setFeedback(lastFeedback ?? null);

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return <div className="p-6">Carregando evolução...</div>;
  }

  if (!data.length) {
    return <div className="p-6">Nenhum dado encontrado.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Minha Evolução</h1>

      <div className="grid grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA */}
        <aside className="col-span-12 md:col-span-3 space-y-4">
          <div className="bg-white rounded shadow p-4 text-sm space-y-1">
            <p><strong>Email:</strong> {userInfo?.email}</p>
            <p><strong>Setor:</strong> {userInfo?.role}</p>
          </div>

          <div className="bg-yellow-200 rounded shadow p-4 text-sm">
            <strong>Nota do Supervisor</strong>
            <p className="text-3xl font-bold mt-2">
              {feedback?.supervisor_score ?? "-"}
            </p>
          </div>

          <div className="bg-green-200 rounded shadow p-4 text-sm">
            <strong>Pontos fortes</strong>
            <p className="mt-2">
              {feedback?.strengths || "—"}
            </p>
          </div>

          <div className="bg-red-200 rounded shadow p-4 text-sm">
            <strong>Pontos a melhorar</strong>
            <p className="mt-2">
              {feedback?.improvements || "—"}
            </p>
          </div>
        </aside>

        {/* GRÁFICOS (INALTERADOS) */}
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
