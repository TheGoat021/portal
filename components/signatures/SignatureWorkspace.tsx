"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, FileText, Link2, LoaderCircle, RefreshCw, Upload } from "lucide-react";

import type { SignatureDocument } from "@/types/signatures";

type CreateFormState = {
  title: string;
  file: File | null;
};

const initialForm: CreateFormState = {
  title: "",
  file: null,
};

const DOCUMENTS_PER_PAGE = 5;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: string) {
  if (status === "pending_signature") return "Aguardando assinatura";
  if (status === "signed") return "Assinado";
  if (status === "cancelled") return "Cancelado";
  if (status === "expired") return "Expirado";
  return "Rascunho";
}

function statusClass(status: string) {
  if (status === "signed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "pending_signature") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export default function SignatureWorkspace() {
  const [documents, setDocuments] = useState<SignatureDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createState, setCreateState] = useState<CreateFormState>(initialForm);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [titleFilter, setTitleFilter] = useState("");
  const [createdAtFilter, setCreatedAtFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!createState.file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(createState.file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [createState.file]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedId) || null,
    [documents, selectedId]
  );

  const filteredDocuments = useMemo(() => {
    const normalizedTitle = titleFilter.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesTitle = normalizedTitle
        ? document.title.toLowerCase().includes(normalizedTitle)
        : true;
      const matchesDate = createdAtFilter
        ? toInputDate(document.createdAt) === createdAtFilter
        : true;

      return matchesTitle && matchesDate;
    });
  }, [createdAtFilter, documents, titleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE));

  const pagedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * DOCUMENTS_PER_PAGE;
    return filteredDocuments.slice(startIndex, startIndex + DOCUMENTS_PER_PAGE);
  }, [currentPage, filteredDocuments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [titleFilter, createdAtFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function loadDocuments() {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await fetch("/api/signatures/contracts", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao carregar contratos.");
      }

      setDocuments(payload.data || []);
      setSelectedId((current) => current || payload.data?.[0]?.id || null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao carregar contratos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDocument() {
    if (!createState.file) {
      setErrorMessage("Selecione um PDF para continuar.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      const form = new FormData();
      form.set("title", createState.title.trim() || createState.file.name.replace(/\.pdf$/i, ""));
      form.set("file", createState.file);

      const response = await fetch("/api/signatures/contracts", {
        method: "POST",
        body: form,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao criar contrato.");
      }

      setCreateState(initialForm);
      setPreviewUrl(null);
      await loadDocuments();
      if (payload?.id) {
        setSelectedId(payload.id);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao criar contrato.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(documentId: string) {
    try {
      setPublishingId(documentId);
      setErrorMessage(null);
      const response = await fetch(`/api/signatures/contracts/${documentId}/publish`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao gerar link.");
      }

      await loadDocuments();
      setSelectedId(payload?.id || documentId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao gerar link.");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleCopyLink(documentId: string) {
    const response = await fetch(`/api/signatures/contracts/${documentId}/link`, {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok || !payload.signingUrl) {
      throw new Error(payload.error || "Link indisponivel.");
    }

    await navigator.clipboard.writeText(payload.signingUrl);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Axion Sign</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Assinatura de contratos</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Faça upload do PDF, revise o documento e gere um link público. Quando o cliente assinar, o sistema anexa uma folha final com o relatório da assinatura.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDocuments()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar lista
          </button>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Novo contrato</h2>
              <p className="text-sm text-slate-500">Suba o PDF original. O relatório de assinatura será anexado automaticamente no final.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Nome interno</label>
              <input
                value={createState.title}
                onChange={(event) => setCreateState((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex: Contrato Nicolas Vitor"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Arquivo PDF</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setCreateState((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              O documento assinado final terá uma página extra com status, hash do PDF original, data/hora, token, nome do signatário, CPF, telefone, IP e dispositivo.
            </div>

            <button
              type="button"
              onClick={() => void handleCreateDocument()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-18px_rgba(37,99,235,0.55)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Criar contrato
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Revisão do documento</h2>
              <p className="text-sm text-slate-500">Confira o PDF original antes de publicar o link.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
              Relatório anexado ao final
            </span>
          </div>

          {previewUrl ? (
            <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
              <object data={previewUrl} type="application/pdf" className="h-[560px] w-full">
                <div className="p-6 text-sm text-slate-500">Seu navegador nao conseguiu renderizar o PDF neste preview.</div>
              </object>
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Envie um PDF para revisar o arquivo original aqui.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Contratos gerados</h2>
              <p className="text-sm text-slate-500">Lista central para acompanhar o que ja foi publicado e assinado.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Filtrar por titulo</label>
              <input
                value={titleFilter}
                onChange={(event) => setTitleFilter(event.target.value)}
                placeholder="Buscar contrato"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Filtrar por data de criacao</label>
              <input
                type="date"
                value={createdAtFilter}
                onChange={(event) => setCreatedAtFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Carregando contratos...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Nenhum contrato encontrado com os filtros atuais.
              </div>
            ) : (
              pagedDocuments.map((document) => (
                <div
                  key={document.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(document.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(document.id);
                    }
                  }}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    selectedId === document.id
                      ? "border-sky-300 bg-sky-50/60 shadow-[0_18px_40px_-26px_rgba(37,99,235,0.5)]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">{document.title}</p>
                      <p className="mt-1 text-xs text-slate-500">Criado em {formatDate(document.createdAt)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass(document.status)}`}>
                      {statusLabel(document.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handlePublish(document.id);
                      }}
                      disabled={publishingId === document.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      {publishingId === document.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                      {document.publicToken ? "Regenerar link" : "Gerar link"}
                    </button>
                    {document.publicToken ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCopyLink(document.id).catch((error: unknown) => {
                            setErrorMessage(error instanceof Error ? error.message : "Erro ao copiar link.");
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar link
                      </button>
                    ) : null}
                    {document.signedFileUrl ? (
                      <a
                        href={document.signedFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Baixar assinado
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && filteredDocuments.length > 0 ? (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-500">
                Mostrando {pagedDocuments.length} de {filteredDocuments.length} contratos
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <span className="text-sm font-medium text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Proximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Detalhes do contrato</h2>
              <p className="text-sm text-slate-500">Acompanhe status, signatário e documento final com relatório de assinatura.</p>
            </div>
          </div>

          {!selectedDocument ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Selecione um contrato para revisar.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{statusLabel(selectedDocument.status)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedDocument.status === "signed"
                      ? `Assinado em ${formatDate(selectedDocument.signedAt)}`
                      : "Aguardando publicacao ou assinatura do cliente."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Assinante</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{selectedDocument.signerName || "-"}</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedDocument.signerCpf || "CPF ainda nao informado"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                O PDF final do cliente será composto pelo contrato original mais uma folha adicional com evidências da assinatura, incluindo hash SHA256, token, data/hora e autenticação.
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handlePublish(selectedDocument.id)}
                  disabled={publishingId === selectedDocument.id}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_-18px_rgba(37,99,235,0.55)] disabled:opacity-60"
                >
                  {publishingId === selectedDocument.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  Publicar link
                </button>
                {selectedDocument.publicToken ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopyLink(selectedDocument.id).catch((error: unknown) => {
                        setErrorMessage(error instanceof Error ? error.message : "Erro ao copiar link.");
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar link publico
                  </button>
                ) : null}
                {selectedDocument.signedFileUrl ? (
                  <a
                    href={selectedDocument.signedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4" />
                    Abrir PDF final
                  </a>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                <object data={selectedDocument.originalFileUrl} type="application/pdf" className="h-[540px] w-full">
                  <div className="p-6 text-sm text-slate-500">Nao foi possivel abrir o PDF do contrato.</div>
                </object>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
