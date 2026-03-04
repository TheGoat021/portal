"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { PortalContent } from "@/components/PortalContent";
import { useAuth } from "@/store/authStore";
import { usePortalStore } from "@/store/portalStore";

type MuralType = "AVISO" | "NOVIDADE" | "LEMBRETE";
type Priority = "BAIXA" | "MEDIA" | "ALTA";

type ApiMuralPost = {
  id: string;
  type: MuralType;
  title: string;
  description: string | null;
  priority: Priority;
  pinned: boolean;
  done: boolean;
  expires_at: string | null;
  created_at: string; // ISO
};

type MuralPost = {
  id: string;
  type: MuralType;
  title: string;
  description?: string | null;
  createdAtLabel: string; // "Hoje", "Ontem" ou "dd/mm"
  createdAtIso: string;
  priority: Priority;
  pinned: boolean;
  done: boolean;
  expiresAt: string | null;
};

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "warning" | "info" | "success";
}) {
  const cls =
    variant === "warning"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : variant === "info"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : variant === "success"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${cls}`}>
      {children}
    </span>
  );
}

function PriorityDot({ priority }: { priority?: Priority }) {
  const cls =
    priority === "ALTA"
      ? "bg-red-500"
      : priority === "MEDIA"
      ? "bg-yellow-500"
      : "bg-gray-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

function formatCreatedAtLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThat.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(d);
}

function formatDateBR(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromDatetimeLocalValue(v: string) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function MuralModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<MuralPost> | null;
  onClose: () => void;
  onSubmit: (payload: {
    type: MuralType;
    title: string;
    description: string | null;
    priority: Priority;
    pinned: boolean;
    expires_at: string | null;
  }) => Promise<void>;
}) {
  const [type, setType] = useState<MuralType>("AVISO");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("BAIXA");
  const [pinned, setPinned] = useState(false);
  const [expiresAtLocal, setExpiresAtLocal] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);

    setType((initial?.type as MuralType) || "AVISO");
    setTitle(initial?.title || "");
    setDescription((initial?.description as string) || "");
    setPriority((initial?.priority as Priority) || "BAIXA");
    setPinned(Boolean(initial?.pinned ?? false));
    setExpiresAtLocal(toDatetimeLocalValue((initial?.expiresAt as string | null) ?? null));
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-xl border border-gray-200 shadow-xl">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {mode === "create" ? "Novo aviso" : "Editar aviso"}
          </h3>
          <button
            className="text-gray-500 hover:text-gray-900"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as MuralType)}
                disabled={saving}
              >
                <option value="AVISO">Aviso</option>
                <option value="NOVIDADE">Novidade</option>
                <option value="LEMBRETE">Lembrete</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                disabled={saving}
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              placeholder="Ex: Manutenção programada"
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[90px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              placeholder="Detalhes do aviso..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expira em</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={expiresAtLocal}
                onChange={(e) => setExpiresAtLocal(e.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Se preencher, o item some automaticamente após essa data/hora.
              </p>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                id="pinned"
                type="checkbox"
                className="h-4 w-4"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                disabled={saving}
              />
              <label htmlFor="pinned" className="text-sm text-gray-700">
                Fixar no topo
              </label>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={saving || !title.trim()}
            onClick={async () => {
              try {
                setSaving(true);
                setError(null);

                await onSubmit({
                  type,
                  title: title.trim(),
                  description: description.trim() ? description.trim() : null,
                  priority,
                  pinned,
                  expires_at: fromDatetimeLocalValue(expiresAtLocal),
                });

                onClose();
              } catch (e: any) {
                setError(e?.message || "Erro ao salvar");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PortalPage() {
  const auth: any = useAuth();
  const role: string = auth?.role;
  const userId: string | undefined = auth?.user?.id || auth?.user?.uid || auth?.id;

  const { activeHref, setActiveHref } = usePortalStore();

  const [tab, setTab] = useState<"TODOS" | MuralType>("TODOS");

  const [posts, setPosts] = useState<MuralPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [errorPosts, setErrorPosts] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingPost, setEditingPost] = useState<MuralPost | null>(null);

  const canEdit = role === "DIRETORIA";

  async function fetchPosts(currentTab = tab) {
    setLoadingPosts(true);
    setErrorPosts(null);

    try {
      const qs = new URLSearchParams();
      if (currentTab !== "TODOS") qs.set("type", currentTab);

      // Por padrão: NÃO traz done e NÃO traz expirados (API já filtra)
      const res = await fetch(`/api/mural?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json?.success) throw new Error(json?.error || "Falha ao carregar mural");

      const data: ApiMuralPost[] = json.data ?? [];
      const mapped: MuralPost[] = data.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        description: p.description,
        priority: p.priority,
        pinned: p.pinned,
        done: p.done,
        createdAtIso: p.created_at,
        createdAtLabel: formatCreatedAtLabel(p.created_at),
        expiresAt: p.expires_at,
      }));

      setPosts(mapped);
    } catch (e: any) {
      setErrorPosts(e?.message || "Erro ao carregar mural");
    } finally {
      setLoadingPosts(false);
    }
  }

  useEffect(() => {
    if (activeHref) return;
    fetchPosts(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeHref]);

  const visiblePosts = useMemo(() => {
    // pinned primeiro
    return [...posts].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  }, [posts]);

  // ✅ Banner topo: primeiro ALTA (já não vem expirado)
  const topHigh = useMemo(() => {
    return visiblePosts.find((p) => p.priority === "ALTA") || null;
  }, [visiblePosts]);

  function openCreate() {
    setModalMode("create");
    setEditingPost(null);
    setModalOpen(true);
  }

  function openEdit(post: MuralPost) {
    setModalMode("edit");
    setEditingPost(post);
    setModalOpen(true);
  }

  async function createPost(payload: {
    type: MuralType;
    title: string;
    description: string | null;
    priority: Priority;
    pinned: boolean;
    expires_at: string | null;
  }) {
    const res = await fetch("/api/mural", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": role || "",
        "x-user-id": userId || "",
      },
      body: JSON.stringify({
        ...payload,
        created_by: userId || null,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json?.success) throw new Error(json?.error || "Falha ao criar");

    await fetchPosts(tab);
  }

  async function updatePost(id: string, payload: Record<string, any>) {
    const res = await fetch(`/api/mural/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": role || "",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json?.success) throw new Error(json?.error || "Falha ao atualizar");

    await fetchPosts(tab);
  }

  async function deletePost(id: string) {
    if (!confirm("Tem certeza que deseja remover este item do mural?")) return;

    const res = await fetch(`/api/mural/${id}`, {
      method: "DELETE",
      headers: {
        "x-user-role": role || "",
      },
    });

    const json = await res.json();
    if (!res.ok || !json?.success) throw new Error(json?.error || "Falha ao remover");

    await fetchPosts(tab);
  }

  return (
    <main className="flex-1 p-6 bg-gray-100 space-y-6">
      {!activeHref && (
        <>
          {/* ✅ Banner topo se existir prioridade alta */}
          {topHigh && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-red-700 text-lg">🚨</span>
                  <p className="font-semibold text-red-800 truncate">
                    {topHigh.title}
                  </p>
                  <Badge variant="warning">Prioridade alta</Badge>
                </div>
                {topHigh.description && (
                  <p className="text-sm text-red-700 mt-1 line-clamp-2">
                    {topHigh.description}
                  </p>
                )}
                <p className="text-xs text-red-700 mt-1">
                  {topHigh.expiresAt ? `Expira em ${formatDateBR(topHigh.expiresAt)}` : "Sem expiração"}
                </p>
              </div>

              <button
                className="shrink-0 text-sm text-red-800 hover:text-red-900"
                onClick={() => alert(`Detalhes: ${topHigh.title}`)}
              >
                Ver →
              </button>
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold">Bem-vindo ao Portal</h1>
            <p className="text-gray-600">
              Perfil ativo: <strong>{role}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {role === "DIRETORIA" && (
              <>
                <DashboardCard title="Relatórios" />
                <DashboardCard title="Financeiro" />
                <DashboardCard title="Campanhas" />
              </>
            )}
          </div>

          {/* ✅ MURAL */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Mural</h2>
                <p className="text-sm text-gray-500">
                  Novidades e avisos importantes do portal.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                {/* Tabs */}
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  {(["TODOS", "AVISO", "NOVIDADE", "LEMBRETE"] as const).map((k) => {
                    const active = tab === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setTab(k)}
                        className={`px-3 py-1.5 text-sm rounded-md transition ${
                          active
                            ? "bg-white shadow-sm border border-gray-200 font-medium"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {k === "TODOS"
                          ? "Todos"
                          : k === "AVISO"
                          ? "Avisos"
                          : k === "NOVIDADE"
                          ? "Novidades"
                          : "Lembretes"}
                      </button>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
                    onClick={() => alert("Depois a gente cria a página /portal/mural 😉")}
                  >
                    Ver todos
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      onClick={openCreate}
                    >
                      + Novo aviso
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200">
              {loadingPosts ? (
                <div className="p-6 text-sm text-gray-500">Carregando mural...</div>
              ) : errorPosts ? (
                <div className="p-6 text-sm text-red-600">{errorPosts}</div>
              ) : visiblePosts.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">Nenhum item no mural.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {visiblePosts.map((post) => {
                    const badgeVariant =
                      post.type === "AVISO"
                        ? "warning"
                        : post.type === "NOVIDADE"
                        ? "info"
                        : "success";

                    // ✅ Destaque conforme prioridade
                    const itemStyle =
                      post.priority === "ALTA"
                        ? "bg-red-50 border border-red-200"
                        : post.priority === "MEDIA"
                        ? "bg-yellow-50 border border-yellow-200"
                        : "bg-white";

                    const titleStyle =
                      post.priority === "ALTA"
                        ? "text-red-700"
                        : post.priority === "MEDIA"
                        ? "text-yellow-800"
                        : "text-gray-900";

                    return (
                      <li
                        key={post.id}
                        className={`p-5 transition rounded-lg ${itemStyle} hover:shadow-sm`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {post.pinned && <Badge variant="default">Fixado</Badge>}

                              <Badge variant={badgeVariant}>
                                {post.type === "AVISO"
                                  ? "Aviso"
                                  : post.type === "NOVIDADE"
                                  ? "Novidade"
                                  : "Lembrete"}
                              </Badge>

                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <PriorityDot priority={post.priority} />
                                <span>
                                  {post.priority === "ALTA"
                                    ? "Alta"
                                    : post.priority === "MEDIA"
                                    ? "Média"
                                    : "Baixa"}
                                </span>
                                <span>•</span>
                                <span>{post.createdAtLabel}</span>

                                {post.expiresAt && (
                                  <>
                                    <span>•</span>
                                    <span className="text-gray-600">
                                      Expira em {formatDateBR(post.expiresAt)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="mt-1 flex items-center gap-2 min-w-0">
                              {post.priority === "ALTA" && (
                                <span className="text-red-600 text-lg">🚨</span>
                              )}

                              <p className={`font-medium truncate ${titleStyle}`}>
                                {post.title}
                              </p>
                            </div>

                            {post.description && (
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                {post.description}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              className="text-sm text-blue-600 hover:text-blue-700"
                              onClick={() => alert(`Detalhes: ${post.title}`)}
                            >
                              Detalhes →
                            </button>

                            {canEdit && (
                              <>
                                <button
                                  className="text-sm text-gray-600 hover:text-gray-900"
                                  onClick={() => updatePost(post.id, { pinned: !post.pinned })}
                                  title={post.pinned ? "Desfixar" : "Fixar"}
                                >
                                  {post.pinned ? "Desfixar" : "Fixar"}
                                </button>

                                <button
                                  className="text-sm text-gray-600 hover:text-gray-900"
                                  onClick={() => openEdit(post)}
                                >
                                  Editar
                                </button>

                                <button
                                  className="text-sm text-red-600 hover:text-red-700"
                                  onClick={() => deletePost(post.id)}
                                >
                                  Excluir
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Modal (criar/editar) */}
          <MuralModal
            open={modalOpen}
            mode={modalMode}
            initial={editingPost}
            onClose={() => setModalOpen(false)}
            onSubmit={async (payload) => {
              if (modalMode === "create") {
                await createPost(payload);
              } else if (editingPost) {
                await updatePost(editingPost.id, payload);
              }
            }}
          />
        </>
      )}

      {activeHref && (
        <PortalContent href={activeHref} onBack={() => setActiveHref(null)} />
      )}
    </main>
  );
}