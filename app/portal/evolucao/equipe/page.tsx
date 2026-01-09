"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type User = {
  id: string;
  email: string;
  role: string;
};

export default function EquipePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDiretoria, setIsDiretoria] = useState(false);

  useEffect(() => {
    async function load() {
      /** usuário logado */
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      /** carrega usuários */
      const res = await fetch("/api/users");
      const allUsers: User[] = await res.json();

      /** valida diretoria */
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Equipe</h1>

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
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.email}</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
