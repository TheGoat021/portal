"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  role: string;
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);

  // criação
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("COMERCIAL");

  // edição
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // busca e paginação
  const [searchRole, setSearchRole] = useState(""); // nome mantido
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 5;

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();

    if (Array.isArray(data)) {
      setUsers(data);
    } else {
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
    setRole("COMERCIAL");
    loadUsers();
  }

  async function deleteUser(id: string) {
    await fetch("/api/users", {
      method: "DELETE",
      body: JSON.stringify({ userId: id }),
    });

    loadUsers();
  }

  async function updateUser() {
    if (!editingUser) return;

    await fetch("/api/users", {
      method: "PUT",
      body: JSON.stringify({
        userId: editingUser.id,
        role: editRole,
        password: editPassword || null,
      }),
    });

    setEditingUser(null);
    setEditPassword("");
    loadUsers();
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // 🔍 filtro por EMAIL (CORRIGIDO)
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchRole.toLowerCase())
  );

  // 📄 paginação
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  // volta pra página 1 ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchRole]);

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

      {/* 🔍 Busca por EMAIL */}
      <div className="bg-white p-4 rounded shadow max-w-sm">
        <input
          placeholder="Buscar por email (ex: joao@empresa.com)"
          className="w-full border p-2 rounded"
          value={searchRole}
          onChange={(e) => setSearchRole(e.target.value)}
        />
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
          {paginatedUsers.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3 space-x-4">
                <button
                  onClick={() => {
                    setEditingUser(u);
                    setEditRole(u.role);
                    setEditPassword("");
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Editar
                </button>

                <button
                  onClick={() => deleteUser(u.id)}
                  className="text-red-600 hover:underline"
                >
                  Remover
                </button>
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

      {/* Modal de edição */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Editar usuário</h2>

            <input
              value={editingUser.email}
              disabled
              className="w-full border p-2 rounded bg-gray-100"
            />

            <input
              type="password"
              placeholder="Nova senha (opcional)"
              className="w-full border p-2 rounded"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
            />

            <select
              className="w-full border p-2 rounded"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
            >
              <option value="COMERCIAL">Comercial</option>
              <option value="AGENDAMENTO">Agendamento</option>
              <option value="EXAMES">Exames</option>
              <option value="DIRETORIA">Diretoria</option>
              <option value="TREINAMENTO">Treinamento</option>
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border rounded"
              >
                Cancelar
              </button>

              <button
                onClick={updateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
