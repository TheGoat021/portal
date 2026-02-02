"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type User = {
  id: string;
  email: string | null; // 👈 importante
  role: string;
};

export default function EquipePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDiretoria, setIsDiretoria] = useState(false);

  // busca e paginação
  const [searchEmail, setSearchEmail] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 5;

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const res = await fetch("/api/users");
      const allUsers: User[] = await res.json();

      const current = allUsers.find((u) => u.id === user.id);
      if (current?.role !== "DIRETORIA") {
        setLoading(false);
        return;
      }

      setIsDiretoria(true);
      setUsers(allUsers);
      setLoading(false);
    }

    load();
  }, []);

  // 🔍 filtro por EMAIL (CORRIGIDO)
  const filteredUsers = users.filter((u) =>
    (u.email ?? "").toLowerCase().includes(searchEmail.toLowerCase())
  );

  // paginação
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchEmail]);

  if (loading) {
    return <div className="p-6">Carregando equipe...</div>;
  }

  if (!isDiretoria) {
    return (
      <div className="p-6 text-red-600 font-semibold">
        Acesso restrito à diretoria.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Equipe</h1>

      {/* Busca */}
      <div className="bg-white p-4 rounded shadow max-w-sm">
        <input
          placeholder="Buscar por email"
          className="w-full border p-2 rounded"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Setor</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.email ?? "-"}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">
                  <Link
                    href={`/portal/evolucao/equipe/${u.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Ver evolução
                  </Link>
                </td>
              </tr>
            ))}

            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  Nenhum usuário encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex justify-between items-center max-w-md">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Anterior
        </button>

        <span className="text-sm">
          Página {currentPage} de {totalPages || 1}
        </span>

        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage((p) => p + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
