"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError(null);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  setLoading(false);

  if (error) {
    setError("Email ou senha inválidos");
    return;
  }

  // ✅ força nova navegação (middleware roda)
  window.location.href = "/portal";
}

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-center">Portal Interno</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded-md px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full border rounded-md px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
