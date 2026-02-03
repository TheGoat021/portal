"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type User = {
  id: string;
  email: string;
  role: string;
};

export default function LancarEvolucaoPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDiretoria, setIsDiretoria] = useState(false);

  const [form, setForm] = useState({
    user_id: "",
    month: "",
    year: "",
    sales_count: "",
    revenue: "",
    commission: "",
    salary: "",
    supervisor_score: "",
    strengths: "",
    improvements: "",
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/users");
      const data: User[] = await res.json();

      const current = data.find((u) => u.id === user.id);

      if (current?.role !== "DIRETORIA") {
        setIsDiretoria(false);
        setLoading(false);
        return;
      }

      setIsDiretoria(true);
      setUsers(data);
      setLoading(false);
    }

    load();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // 🔎 Busca evolução existente (se houver)
    const { data: existing } = await supabase
      .from("seller_monthly_performance")
      .select("*")
      .eq("user_id", form.user_id)
      .eq("month", Number(form.month))
      .eq("year", Number(form.year))
      .maybeSingle();

    // 🧩 Monta payload preservando dados antigos
    const payload = {
      user_id: form.user_id,
      month: Number(form.month),
      year: Number(form.year),

      sales_count:
        form.sales_count !== ""
          ? Number(form.sales_count)
          : existing?.sales_count ?? 0,

      revenue:
        form.revenue !== ""
          ? Number(form.revenue)
          : existing?.revenue ?? 0,

      commission:
        form.commission !== ""
          ? Number(form.commission)
          : existing?.commission ?? 0,

      salary:
        form.salary !== ""
          ? Number(form.salary)
          : existing?.salary ?? 0,

      supervisor_score:
        form.supervisor_score !== ""
          ? Number(form.supervisor_score)
          : existing?.supervisor_score ?? 0,

      strengths:
        form.strengths !== ""
          ? form.strengths
          : existing?.strengths ?? "",

      improvements:
        form.improvements !== ""
          ? form.improvements
          : existing?.improvements ?? "",
    };

    const { error } = await supabase
      .from("seller_monthly_performance")
      .upsert(payload, {
        onConflict: "user_id,month,year",
      });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Evolução salva com sucesso!");

    setForm({
      user_id: "",
      month: "",
      year: "",
      sales_count: "",
      revenue: "",
      commission: "",
      salary: "",
      supervisor_score: "",
      strengths: "",
      improvements: "",
    });
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!isDiretoria) {
    return (
      <div className="p-6 text-red-600 font-semibold">
        Acesso restrito à diretoria.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Lançar Evolução Mensal</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          name="user_id"
          value={form.user_id}
          onChange={handleChange}
          required
          className="w-full border p-2 rounded"
        >
          <option value="">Selecione o colaborador</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="number"
            name="month"
            placeholder="Mês"
            required
            className="w-1/2 border p-2 rounded"
            value={form.month}
            onChange={handleChange}
          />
          <input
            type="number"
            name="year"
            placeholder="Ano"
            required
            className="w-1/2 border p-2 rounded"
            value={form.year}
            onChange={handleChange}
          />
        </div>

        <input
          type="number"
          name="sales_count"
          placeholder="Quantidade de vendas"
          className="w-full border p-2 rounded"
          value={form.sales_count}
          onChange={handleChange}
        />

        <input
          type="number"
          step="0.01"
          name="revenue"
          placeholder="Faturamento"
          className="w-full border p-2 rounded"
          value={form.revenue}
          onChange={handleChange}
        />

        <input
          type="number"
          step="0.01"
          name="commission"
          placeholder="Comissão"
          className="w-full border p-2 rounded"
          value={form.commission}
          onChange={handleChange}
        />

        <input
          type="number"
          step="0.01"
          name="salary"
          placeholder="Salário"
          className="w-full border p-2 rounded"
          value={form.salary}
          onChange={handleChange}
        />

        <input
          type="number"
          step="0.1"
          name="supervisor_score"
          placeholder="Nota do supervisor"
          className="w-full border p-2 rounded"
          value={form.supervisor_score}
          onChange={handleChange}
        />

        <textarea
          name="strengths"
          placeholder="Pontos fortes"
          className="w-full border p-2 rounded"
          value={form.strengths}
          onChange={handleChange}
        />

        <textarea
          name="improvements"
          placeholder="Pontos a melhorar"
          className="w-full border p-2 rounded"
          value={form.improvements}
          onChange={handleChange}
        />

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {saving ? "Salvando..." : "Salvar evolução"}
        </button>
      </form>
    </div>
  );
}
