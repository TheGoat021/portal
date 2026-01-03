"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  role: string;
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("COMERCIAL");

  async function loadUsers() {
  const res = await fetch("/api/users");
  const data = await res.json();

  if (Array.isArray(data)) {
    setUsers(data);
  } else {
    console.error("Resposta inesperada da API:", data);
    setUsers([]);
  }
}

  async function createUser() {
    await fetch("/api/users", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });

    setEmail("");
    setPassword("");
    loadUsers();
  }

  async function deleteUser(id: string) {
    await fetch("/api/users", {
      method: "DELETE",
      body: JSON.stringify({ userId: id }),
    });

    loadUsers();
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usuários</h1>

      {/* Criar usuário */}
      <div className="bg-white p-4 rounded shadow space-y-3 max-w-md">
        <input
          placeholder="Email"
          className="w-full border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Senha"
          type="password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          className="w-full border p-2 rounded"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="COMERCIAL">Comercial</option>
          <option value="AGENDAMENTO">Agendamento</option>
          <option value="EXAMES">Exames</option>
          <option value="DIRETORIA">Diretoria</option>
          <option value="TREINAMENTO">Treinamento</option>
        </select>

        <button
          onClick={createUser}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Criar usuário
        </button>
      </div>

      {/* Lista */}
      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Perfil</th>
            <th className="p-3 text-left">Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3">
                <button
                  onClick={() => deleteUser(u.id)}
                  className="text-red-600 hover:underline"
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
