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
  const [existingId, setExistingId] = useState<string | null>(null);

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

  /* 🔄 usuários */
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  /* 🔎 verifica lançamento existente */
  useEffect(() => {
    async function checkExisting() {
      if (!form.user_id || !form.month || !form.year) return;

      const { data } = await supabase
        .from("seller_monthly_performance")
        .select("*")
        .eq("user_id", form.user_id)
        .eq("month", Number(form.month))
        .eq("year", Number(form.year))
        .single();

      if (data) {
        setExistingId(data.id);
        setForm({
          user_id: data.user_id,
          month: String(data.month),
          year: String(data.year),
          sales_count: String(data.sales_count ?? ""),
          revenue: String(data.revenue ?? ""),
          commission: String(data.commission ?? ""),
          salary: String(data.salary ?? ""),
          supervisor_score: String(data.supervisor_score ?? ""),
          strengths: data.strengths ?? "",
          improvements: data.improvements ?? "",
        });
      } else {
        setExistingId(null);
      }
    }

    checkExisting();
  }, [form.user_id, form.month, form.year]);

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

    const payload = {
      user_id: form.user_id,
      month: Number(form.month),
      year: Number(form.year),
      sales_count: Number(form.sales_count),
      revenue: Number(form.revenue),
      commission: Number(form.commission),
      salary: Number(form.salary),
      supervisor_score: Number(form.supervisor_score),
      strengths: form.strengths,
      improvements: form.improvements,
    };

    const result = existingId
      ? await supabase
          .from("seller_monthly_performance")
          .update(payload)
          .eq("id", existingId)
      : await supabase.from("seller_monthly_performance").insert(payload);

    setSaving(false);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    alert(existingId ? "Lançamento atualizado!" : "Lançamento criado!");
  }

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">
        {existingId ? "Editar Evolução" : "Lançar Evolução"}
      </h1>

      {existingId && (
        <div className="mb-4 bg-yellow-100 p-3 rounded text-sm">
          ⚠️ Este mês já possui lançamento. Você está editando os dados.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          name="user_id"
          value={form.user_id}
          onChange={handleChange}
          required
          className="w-full border p-2 rounded"
        >
          <option value="">Selecione o vendedor</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            name="month"
            type="number"
            min={1}
            max={12}
            placeholder="Mês"
            value={form.month}
            onChange={handleChange}
            required
            className="w-1/2 border p-2 rounded"
          />
          <input
            name="year"
            type="number"
            placeholder="Ano"
            value={form.year}
            onChange={handleChange}
            required
            className="w-1/2 border p-2 rounded"
          />
        </div>

        <input name="sales_count" placeholder="Vendas" value={form.sales_count} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="revenue" placeholder="Faturamento" value={form.revenue} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="commission" placeholder="Comissão" value={form.commission} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="salary" placeholder="Salário" value={form.salary} onChange={handleChange} className="w-full border p-2 rounded" />

        <input
          name="supervisor_score"
          placeholder="Nota do supervisor"
          value={form.supervisor_score}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <textarea
          name="strengths"
          placeholder="Pontos fortes"
          value={form.strengths}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <textarea
          name="improvements"
          placeholder="Pontos a melhorar"
          value={form.improvements}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <button
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          {saving
            ? "Salvando..."
            : existingId
            ? "Atualizar lançamento"
            : "Salvar lançamento"}
        </button>
      </form>
    </div>
  );
}
