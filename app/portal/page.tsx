"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  ChevronRight,
  Clock3,
  Newspaper,
  Pin,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

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
  created_at: string;
};

type MuralPost = {
  id: string;
  type: MuralType;
  title: string;
  description?: string | null;
  createdAtLabel: string;
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
  variant?: "default" | "warning" | "info" | "success" | "danger";
}) {
  const cls =
    variant === "warning"
      ? "border-amber-200/70 bg-amber-50/80 text-amber-700"
      : variant === "info"
        ? "border-sky-200/70 bg-sky-50/80 text-sky-700"
        : variant === "success"
          ? "border-emerald-200/70 bg-emerald-50/80 text-emerald-700"
          : variant === "danger"
            ? "border-rose-200/70 bg-rose-50/80 text-rose-700"
            : "border-slate-200/70 bg-white/75 text-slate-600";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function PriorityDot({ priority }: { priority?: Priority }) {
  const cls =
    priority === "ALTA"
      ? "bg-rose-400"
      : priority === "MEDIA"
        ? "bg-amber-400"
        : "bg-slate-300";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function formatCreatedAtLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThat.getTime()) / (1000 * 60 * 60 * 24),
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("BAIXA");
  const [pinned, setPinned] = useState(false);
  const [expiresAtLocal, setExpiresAtLocal] = useState("");
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
      <div className="absolute inset-0 bg-slate-900/18 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-[32px] border border-white/70 bg-white/76 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
        <div className="border-b border-white/60 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Mural</p>
              <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-900">
                {mode === "create" ? "Novo aviso" : "Editar aviso"}
              </h3>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-slate-500" onClick={onClose} disabled={saving}>×</button>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          {error ? <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 p-3 text-sm text-rose-700">{error}</div> : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Tipo</label>
              <select className="w-full rounded-2xl border border-white/70 bg-white/72 px-3 py-3 text-sm text-slate-700" value={type} onChange={(e) => setType(e.target.value as MuralType)} disabled={saving}>
                <option value="AVISO">Aviso</option>
                <option value="NOVIDADE">Novidade</option>
                <option value="LEMBRETE">Lembrete</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Prioridade</label>
              <select className="w-full rounded-2xl border border-white/70 bg-white/72 px-3 py-3 text-sm text-slate-700" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} disabled={saving}>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Título</label>
            <input className="w-full rounded-2xl border border-white/70 bg-white/72 px-3 py-3 text-sm text-slate-700" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} placeholder="Ex: manutenção programada" maxLength={120} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Descrição</label>
            <textarea className="min-h-[110px] w-full rounded-2xl border border-white/70 bg-white/72 px-3 py-3 text-sm text-slate-700" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} placeholder="Detalhes do aviso..." />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Expira em</label>
              <input type="datetime-local" className="w-full rounded-2xl border border-white/70 bg-white/72 px-3 py-3 text-sm text-slate-700" value={expiresAtLocal} onChange={(e) => setExpiresAtLocal(e.target.value)} disabled={saving} />
            </div>
            <div className="flex items-center gap-2 pt-8">
              <input id="pinned" type="checkbox" className="h-4 w-4 rounded" checked={pinned} onChange={(e) => setPinned(e.target.checked)} disabled={saving} />
              <label htmlFor="pinned" className="text-sm text-slate-600">Fixar no topo</label>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/60 px-6 py-5">
          <button className="rounded-2xl border border-white/70 bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-600" onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            className="rounded-2xl bg-[linear-gradient(135deg,#2563eb,#38bdf8)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_40px_rgba(37,99,235,0.28)] disabled:opacity-60"
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
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Erro ao salvar");
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
  const auth = useAuth();
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
      const res = await fetch(`/api/mural?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "Falha ao carregar mural");
      const data: ApiMuralPost[] = json.data ?? [];
      setPosts(
        data.map((p) => ({
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
        })),
      );
    } catch (e: unknown) {
      setErrorPosts(e instanceof Error ? e.message : "Erro ao carregar mural");
    } finally {
      setLoadingPosts(false);
    }
  }

  useEffect(() => {
    if (activeHref) return;
    fetchPosts(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeHref]);

  const visiblePosts = useMemo(
    () => [...posts].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))),
    [posts],
  );
  const topHigh = useMemo(() => visiblePosts.find((p) => p.priority === "ALTA") || null, [visiblePosts]);
  const stats = useMemo(() => [
    { label: "Itens ativos", value: String(visiblePosts.length), note: "Mural operacional", tone: "from-cyan-300/30 to-sky-200/25" },
    { label: "Prioridade alta", value: String(visiblePosts.filter((p) => p.priority === "ALTA").length), note: "Exigem atenção", tone: "from-rose-200/35 to-amber-200/25" },
    { label: "Fixados", value: String(visiblePosts.filter((p) => p.pinned).length), note: "Destaques persistentes", tone: "from-violet-200/35 to-fuchsia-200/20" },
    { label: "Novidades", value: String(visiblePosts.filter((p) => p.type === "NOVIDADE").length), note: "Atualizações recentes", tone: "from-emerald-200/35 to-cyan-200/25" },
  ], [visiblePosts]);

  async function createPost(payload: { type: MuralType; title: string; description: string | null; priority: Priority; pinned: boolean; expires_at: string | null }) {
    const res = await fetch("/api/mural", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": role || "", "x-user-id": userId || "" },
      body: JSON.stringify({ ...payload, created_by: userId || null }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) throw new Error(json?.error || "Falha ao criar");
    await fetchPosts(tab);
  }

  async function updatePost(id: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/mural/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-role": role || "" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) throw new Error(json?.error || "Falha ao atualizar");
    await fetchPosts(tab);
  }

  async function deletePost(id: string) {
    if (!confirm("Tem certeza que deseja remover este item do mural?")) return;
    const res = await fetch(`/api/mural/${id}`, { method: "DELETE", headers: { "x-user-role": role || "" } });
    const json = await res.json();
    if (!res.ok || !json?.success) throw new Error(json?.error || "Falha ao remover");
    await fetchPosts(tab);
  }

  function openCreate() {
    setModalMode("create");
    setEditingPost(null);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {!activeHref ? (
        <>
          <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/56 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur-2xl md:p-8">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl" />
              <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />
              <div className="absolute bottom-0 left-1/3 h-40 w-64 rounded-full bg-emerald-200/25 blur-3xl" />
            </div>
            <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_420px]">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">AI Native Workspace</Badge>
                  <Badge>{role || "Portal"}</Badge>
                  {topHigh ? <Badge variant="danger">Atenção ativa</Badge> : null}
                </div>
                <div className="max-w-3xl space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"></p>
                  <h1 className="text-4xl font-semibold tracking-[-0.06em] text-slate-900 md:text-5xl">Sistema operacional empresarial com IA integrada.</h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg"></p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="relative overflow-hidden rounded-[24px] border border-white/70 bg-white/64 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.12)]">
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.tone}`} />
                      <div className="relative z-10">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-900">{stat.value}</p>
                        <p className="mt-1 text-sm text-slate-600">{stat.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[30px] border border-white/75 bg-white/66 p-5 shadow-[0_16px_40px_rgba(148,163,184,0.14)]">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-[linear-gradient(135deg,rgba(191,219,254,0.75),rgba(255,255,255,0.82))] text-slate-700"><Sparkles size={18} /></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Pulse de hoje</p>
                    <p className="text-sm leading-6 text-slate-600"></p>
                  </div>
                </div>
                {topHigh ? (
                  <div className="rounded-[24px] border border-rose-200/70 bg-[linear-gradient(135deg,rgba(255,241,242,0.94),rgba(255,255,255,0.82))] p-4">
                    <div className="mb-3 flex items-center gap-2"><ShieldAlert size={16} className="text-rose-500" /><p className="text-sm font-semibold text-rose-700">Prioridade alta</p></div>
                    <p className="text-base font-semibold tracking-[-0.02em] text-slate-900">{topHigh.title}</p>
                    {topHigh.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{topHigh.description}</p> : null}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">{topHigh.expiresAt ? `Expira em ${formatDateBR(topHigh.expiresAt)}` : "Sem expiração"}</p>
                      <button className="inline-flex items-center gap-1 text-sm font-medium text-rose-700" onClick={() => alert(`Detalhes: ${topHigh.title}`)}><span>Ver</span><ChevronRight size={15} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-white/80 bg-white/72 p-4 text-sm leading-6 text-slate-600">Nenhum alerta crítico no momento. O workspace está estável e pronto para o fluxo operacional do dia.</div>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[36px] border border-white/70 bg-white/56 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur-2xl">
            <div className="border-b border-white/60 px-6 py-6 md:px-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/80 text-slate-700"><BellRing size={18} /></div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"></p>
                      <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-900">Mural do portal</h2>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">Novidades, lembretes e avisos importantes em uma visão limpa para o time inteiro.</p>
                </div>
                <div className="flex flex-col gap-3 xl:items-end">
                  <div className="inline-flex rounded-[20px] border border-white/75 bg-white/68 p-1.5">
                    {(["TODOS", "AVISO", "NOVIDADE", "LEMBRETE"] as const).map((k) => {
                      const active = tab === k;
                      return (
                        <button key={k} onClick={() => setTab(k)} className={`rounded-2xl px-4 py-2 text-sm transition ${active ? "bg-white text-slate-900 shadow-[0_10px_24px_rgba(148,163,184,0.14)]" : "text-slate-500 hover:text-slate-900"}`}>
                          {k === "TODOS" ? "Todos" : k === "AVISO" ? "Avisos" : k === "NOVIDADE" ? "Novidades" : "Lembretes"}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded-2xl border border-white/70 bg-white/68 px-4 py-2.5 text-sm font-medium text-slate-600" onClick={() => alert("Depois a gente cria a página /portal/mural 😉")}>Ver todos</button>
                    {canEdit ? <button type="button" className="rounded-2xl bg-[linear-gradient(135deg,#2563eb,#38bdf8)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_40px_rgba(37,99,235,0.28)]" onClick={openCreate}>+ Novo aviso</button> : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 md:px-8">
              {loadingPosts ? <div className="rounded-[28px] border border-white/70 bg-white/66 p-6 text-sm text-slate-500">Carregando mural...</div> : errorPosts ? <div className="rounded-[28px] border border-rose-200/70 bg-rose-50/70 p-6 text-sm text-rose-700">{errorPosts}</div> : visiblePosts.length === 0 ? <div className="rounded-[28px] border border-white/70 bg-white/66 p-8 text-sm text-slate-500">Nenhum item no mural.</div> : (
                <ul className="space-y-4">
                  {visiblePosts.map((post) => {
                    const badgeVariant = post.type === "AVISO" ? "warning" : post.type === "NOVIDADE" ? "info" : "success";
                    const itemStyle = post.priority === "ALTA" ? "border-rose-200/70 bg-[linear-gradient(135deg,rgba(255,241,242,0.92),rgba(255,255,255,0.8))]" : post.priority === "MEDIA" ? "border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.9),rgba(255,255,255,0.8))]" : "border-white/70 bg-white/64";
                    return (
                      <li key={post.id} className={`overflow-hidden rounded-[28px] border p-5 shadow-[0_16px_40px_rgba(148,163,184,0.1)] transition hover:-translate-y-0.5 ${itemStyle}`}>
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              {post.pinned ? <Badge><span className="mr-1 inline-flex"><Pin size={12} /></span>Fixado</Badge> : null}
                              <Badge variant={badgeVariant}>{post.type === "AVISO" ? "Aviso" : post.type === "NOVIDADE" ? "Novidade" : "Lembrete"}</Badge>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <PriorityDot priority={post.priority} />
                                <span>{post.priority === "ALTA" ? "Alta" : post.priority === "MEDIA" ? "Média" : "Baixa"}</span>
                                <span>•</span>
                                <span>{post.createdAtLabel}</span>
                                {post.expiresAt ? <><span>•</span><span>Expira em {formatDateBR(post.expiresAt)}</span></> : null}
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/76 text-slate-700">
                                {post.type === "AVISO" ? <ShieldAlert size={18} /> : post.type === "NOVIDADE" ? <Newspaper size={18} /> : <Clock3 size={18} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">{post.title}</p>
                                {post.description ? <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">{post.description}</p> : null}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-3 xl:justify-end">
                            <button className="inline-flex items-center gap-1 text-sm font-medium text-sky-700" onClick={() => alert(`Detalhes: ${post.title}`)}><span>Detalhes</span><ChevronRight size={15} /></button>
                            {canEdit ? (
                              <>
                                <button className="text-sm text-slate-500" onClick={() => updatePost(post.id, { pinned: !post.pinned })}>{post.pinned ? "Desfixar" : "Fixar"}</button>
                                <button className="text-sm text-slate-500" onClick={() => { setModalMode("edit"); setEditingPost(post); setModalOpen(true); }}>Editar</button>
                                <button className="text-sm text-rose-600" onClick={() => deletePost(post.id)}>Excluir</button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <MuralModal
            open={modalOpen}
            mode={modalMode}
            initial={editingPost}
            onClose={() => setModalOpen(false)}
            onSubmit={async (payload) => {
              if (modalMode === "create") await createPost(payload);
              else if (editingPost) await updatePost(editingPost.id, payload);
            }}
          />
        </>
      ) : (
        <PortalContent href={activeHref} onBack={() => setActiveHref(null)} />
      )}
    </div>
  );
}
