"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, LoaderCircle, PenTool } from "lucide-react";

import type { PublicSignatureDocument, SignatureFont } from "@/types/signatures";

const fontOptions: Array<{ id: SignatureFont; label: string; family: string }> = [
  { id: "classic", label: "Padrao", family: '"Segoe Script", "Brush Script MT", cursive' },
  { id: "elegant", label: "Elegante", family: '"Times New Roman", serif' },
  { id: "formal", label: "Formal", family: "Georgia, serif" },
  { id: "monospace", label: "Monoespaco", family: '"Courier New", monospace' },
];

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

export default function PublicSignatureView({ token }: { token: string }) {
  const [document, setDocument] = useState<PublicSignatureDocument | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [signatureFont, setSignatureFont] = useState<SignatureFont>("classic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeFontFamily = useMemo(
    () => fontOptions.find((option) => option.id === signatureFont)?.family || fontOptions[0].family,
    [signatureFont]
  );

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await fetch(`/api/signatures/public/${token}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao carregar contrato.");
      }

      setDocument(payload);
      if (payload.signerName) setFullName(payload.signerName);
      if (payload.signerCpf) setCpf(payload.signerCpf);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao carregar contrato.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  async function handleSign() {
    try {
      setSaving(true);
      setErrorMessage(null);

      const response = await fetch(`/api/signatures/public/${token}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phone,
          cpf,
          signatureFont,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao assinar contrato.");
      }

      await loadDocument();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao assinar contrato.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-6">
        <div className="rounded-[28px] border border-white/70 bg-white/90 px-6 py-5 text-sm text-slate-600 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)]">
          Carregando contrato para assinatura...
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-6">
        <div className="rounded-[28px] border border-rose-200 bg-white px-6 py-5 text-sm text-rose-700 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)]">
          {errorMessage || "Contrato nao encontrado."}
        </div>
      </div>
    );
  }

  const isSigned = document.status === "signed";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-8">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Assinatura digital</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{document.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Revise seus dados, visualize o contrato completo e confirme a assinatura eletronicamente.
          </p>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
          ) : null}

          {isSigned ? (
            <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900">Contrato assinado com sucesso</h2>
                  <p className="mt-1 text-sm text-emerald-800">
                    Assinado por {document.signerName || fullName} em {formatDate(document.signedAt)}.
                  </p>
                  {document.signedFileUrl ? (
                    <a
                      href={document.signedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      <Download className="h-4 w-4" />
                      Baixar PDF assinado
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Nome completo</label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300"
                    placeholder="Digite seu nome completo"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Telefone</label>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">CPF</label>
                <input
                  value={cpf}
                  onChange={(event) => setCpf(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300"
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <PenTool className="h-4 w-4" />
                  Visual da assinatura
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {fontOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSignatureFont(option.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        signatureFont === option.id
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{option.label}</div>
                      <div className="mt-2 text-2xl text-sky-900" style={{ fontFamily: option.family }}>
                        {fullName || "Seu nome aqui"}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex justify-end">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-slate-700">
                      SIGNATARIO
                    </span>
                  </div>
                  <div className="mt-1 text-3xl text-sky-800" style={{ fontFamily: activeFontFamily }}>
                    {fullName || "Seu nome aqui"}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">Assinado eletronicamente por</div>
                  <div className="text-sm font-semibold text-slate-900">{fullName || "Nome completo"}</div>
                  <div className="text-sm text-slate-500">CPF: {cpf || "000.000.000-00"}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSign()}
                disabled={saving || !fullName.trim() || !phone.trim() || !cpf.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-18px_rgba(37,99,235,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
                Assinar agora
              </button>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/88 p-4 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)]">
          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <object data={document.originalFileUrl} type="application/pdf" className="h-[85vh] min-h-[720px] w-full">
              <div className="p-6 text-sm text-slate-500">Nao foi possivel renderizar o contrato neste navegador.</div>
            </object>
          </div>
        </section>
      </div>
    </div>
  );
}
