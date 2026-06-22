"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import styles from "./AxionLeague.module.css";
import { AxionLeagueArenaBoard } from "./AxionLeagueArenaBoard";
import type { LeagueAvailableUser } from "./types";
import { useAxionLeagueLive } from "./useAxionLeagueLive";

type LeagueTab = "register" | "arena" | "table";

const TABS: Array<{ id: LeagueTab; label: string; eyebrow: string }> = [
  { id: "register", label: "Registrar Resultados", eyebrow: "Admin" },
  { id: "arena", label: "Arena Ao Vivo", eyebrow: "TV Mode" },
  { id: "table", label: "Tabela", eyebrow: "Standings" },
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AxionLeaguePortal() {
  const { snapshot, loading, error } = useAxionLeagueLive();
  const [activeTab, setActiveTab] = useState<LeagueTab>("register");
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participants, setParticipants] = useState<LeagueAvailableUser[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [actionType, setActionType] = useState<"sale" | "recovery">("sale");
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingParticipants, setSavingParticipants] = useState(false);
  const [roundActionLoading, setRoundActionLoading] = useState<"close" | "reset" | null>(null);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
  const [adjustingMatchId, setAdjustingMatchId] = useState<string | null>(null);
  const [scoreEdits, setScoreEdits] = useState<Record<string, { playerA: string; playerB: string }>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error">("success");
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (snapshot?.availableUsers) {
      setParticipants(snapshot.availableUsers);
    }
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot?.matches) {
      return;
    }

    setScoreEdits((current) => {
      const next: Record<string, { playerA: string; playerB: string }> = {};

      for (const match of snapshot.matches) {
        next[match.id] = current[match.id] ?? {
          playerA: String(match.player_a_score),
          playerB: String(match.player_b_score),
        };
      }

      return next;
    });
  }, [snapshot]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/axion-league/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          type: actionType,
          observation,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel registrar o gol.");
      }

      setObservation("");
      setFeedbackTone("success");
      setFeedback("Gol registrado com sucesso. Placar e tabela estao sendo atualizados em tempo real.");
    } catch (err) {
      setFeedbackTone("error");
      setFeedback(err instanceof Error ? err.message : "Erro ao registrar gol.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveParticipants() {
    setSavingParticipants(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/axion-league/participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participants: participants.map((participant) => ({
            userId: participant.userId,
            nickname: participant.nickname,
            participating: participant.participating,
          })),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel salvar os participantes.");
      }

      setParticipants(payload.users);
      setFeedbackTone("success");
      setFeedback("Participantes e apelidos salvos. A proxima rodada vai usar apenas os colaboradores marcados.");
    } catch (err) {
      setFeedbackTone("error");
      setFeedback(err instanceof Error ? err.message : "Erro ao salvar participantes.");
    } finally {
      setSavingParticipants(false);
    }
  }

  async function handleParticipantPhotoChange(userId: string, file: File | null) {
    if (!file) {
      return;
    }

    setUploadingPhotoFor(userId);
    setFeedback(null);

    try {
      const form = new FormData();
      form.append("userId", userId);
      form.append("file", file);

      const response = await fetch("/api/axion-league/participants/photo", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel enviar a foto.");
      }

      setParticipants(payload.users);
      setFeedbackTone("success");
      setFeedback("Foto do participante atualizada. O popup de gol ja pode usar essa imagem.");
    } catch (err) {
      setFeedbackTone("error");
      setFeedback(err instanceof Error ? err.message : "Erro ao subir foto do participante.");
    } finally {
      setUploadingPhotoFor(null);
      if (fileInputsRef.current[userId]) {
        fileInputsRef.current[userId]!.value = "";
      }
    }
  }

  async function handleCloseRound() {
    setRoundActionLoading("close");
    setFeedback(null);

    try {
      const response = await fetch("/api/axion-league/admin/round/close", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel encerrar a rodada.");
      }

      setFeedbackTone("success");
      setFeedback(
        `Rodada encerrada com sucesso. ${payload.closedMatches ?? 0} confronto(s) fechado(s) e nova rodada ${payload.nextRound ?? ""} iniciada automaticamente.`,
      );
    } catch (err) {
      setFeedbackTone("error");
      setFeedback(err instanceof Error ? err.message : "Erro ao encerrar rodada.");
    } finally {
      setRoundActionLoading(null);
    }
  }

  async function handleResetChampionship() {
    setRoundActionLoading("reset");
    setFeedback(null);

    try {
      const response = await fetch("/api/axion-league/admin/reset", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel resetar o campeonato.");
      }

      setFeedbackTone("success");
      setFeedback(
        `Campeonato resetado. Rodadas, gols e classificacao foram zerados, e a rodada ${payload.nextRound ?? ""} foi criada novamente.`,
      );
    } catch (err) {
      setFeedbackTone("error");
      setFeedback(err instanceof Error ? err.message : "Erro ao resetar campeonato.");
    } finally {
      setRoundActionLoading(null);
    }
  }

  async function handleAdjustMatchScore(matchId: string) {
    const scores = scoreEdits[matchId];
    if (!scores) {
      return;
    }

    setAdjustingMatchId(matchId);
    setFeedback(null);

    try {
      const response = await fetch("/api/axion-league/admin/matches/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          playerAScore: Number(scores.playerA),
          playerBScore: Number(scores.playerB),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel ajustar o placar.");
      }

      setFeedbackTone("success");
      setFeedback("Placar ajustado manualmente. A arena e a tabela vao refletir a correcao em tempo real.");
    } catch (err) {
      setFeedbackTone("error");
      setFeedback(err instanceof Error ? err.message : "Erro ao ajustar placar.");
    } finally {
      setAdjustingMatchId(null);
    }
  }

  return (
    <div className={`${styles.leagueSurface} ${styles.leagueGrid} min-h-screen rounded-[36px] border border-white/70 p-5 shadow-[0_28px_80px_rgba(148,163,184,0.14)] md:p-8`}>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(240,248,255,0.96))] p-6 shadow-[0_24px_80px_rgba(56,189,248,0.10)] md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.34em] text-sky-700">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Axion League
              </div>
              <h1 className={`mt-5 text-5xl font-black uppercase tracking-[0.05em] text-slate-950 md:text-6xl ${styles.headlineGlow}`}>
                Campeonato de vendas com cara de broadcast esportivo
              </h1>
              <p className="mt-4 max-w-3xl text-lg text-slate-600">
                Confrontos diarios, tabela viva, carta estilo FUT e arena em tempo real para deixar a equipe inteira acompanhando cada lance.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Rodada</p>
                <p className="mt-2 text-4xl font-black text-slate-950">{snapshot?.meta.round ?? "--"}</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Confrontos</p>
                <p className="mt-2 text-4xl font-black text-slate-950">{snapshot?.matches.length ?? 0}</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Elenco</p>
                <p className="mt-2 text-4xl font-black text-slate-950">{snapshot?.meta.totalEmployees ?? 0}</p>
              </div>
            </div>
          </div>
        </section>

        <nav className="flex flex-wrap gap-3">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[22px] border px-5 py-4 text-left transition ${
                  active
                    ? "border-cyan-200 bg-[linear-gradient(135deg,#082f49_0%,#0f4c81_100%)] text-white shadow-[0_18px_48px_rgba(8,47,73,0.28)]"
                    : "border-white/80 bg-white/82 text-slate-700 shadow-[0_14px_36px_rgba(148,163,184,0.10)] hover:border-sky-200 hover:bg-sky-50"
                }`}
              >
                <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${active ? "text-sky-100/80" : "text-slate-500"}`}>
                  {tab.eyebrow}
                </p>
                <p className="mt-1 text-2xl font-black uppercase tracking-[0.05em]">{tab.label}</p>
              </button>
            );
          })}
        </nav>

        {loading ? (
          <div className="rounded-[30px] border border-white/80 bg-white/82 p-10 text-center text-lg font-semibold text-slate-500 shadow-[0_18px_48px_rgba(148,163,184,0.10)]">
            Carregando a temporada da Axion League...
          </div>
        ) : error ? (
          <div className="rounded-[30px] border border-rose-200 bg-rose-50 p-10 text-center shadow-[0_18px_48px_rgba(244,63,94,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-rose-600">Falha ao carregar</p>
            <p className="mt-3 text-xl font-bold text-rose-900">{error}</p>
          </div>
        ) : snapshot ? (
          <>
            {activeTab === "register" ? (
              <section className="space-y-6">
                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <article className="rounded-[30px] border border-white/80 bg-white/86 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.10)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                    Registrar Resultados
                  </p>
                  <h2 className="mt-3 text-4xl font-black uppercase tracking-[0.05em] text-slate-950">
                    Lançar gol da rodada
                  </h2>
                  <p className="mt-3 text-base text-slate-600">
                    Cada acao entra no banco, atualiza o placar e dispara a animacao ao vivo em todas as telas.
                  </p>

                  <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    <div>
                      <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">
                        Colaborador
                      </label>
                      <select
                        value={employeeId}
                        onChange={(event) => setEmployeeId(event.target.value)}
                        className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                        required
                      >
                        <option value="">Selecione um colaborador</option>
                        {snapshot.employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">
                        Tipo de acao
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setActionType("sale")}
                          className={`rounded-[20px] border px-4 py-4 text-left transition ${
                            actionType === "sale"
                              ? "border-cyan-200 bg-cyan-50 shadow-[0_16px_36px_rgba(34,211,238,0.16)]"
                              : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-white"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Venda Nova
                          </p>
                          <p className="mt-2 text-2xl font-black text-slate-950">+2 gols</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionType("recovery")}
                          className={`rounded-[20px] border px-4 py-4 text-left transition ${
                            actionType === "recovery"
                              ? "border-emerald-200 bg-emerald-50 shadow-[0_16px_36px_rgba(16,185,129,0.16)]"
                              : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-white"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Recuperacao
                          </p>
                          <p className="mt-2 text-2xl font-black text-slate-950">+1 gol</p>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">
                        Observacao opcional
                      </label>
                      <textarea
                        value={observation}
                        onChange={(event) => setObservation(event.target.value)}
                        rows={4}
                        placeholder="Detalhe do lance, cliente ou contexto da acao..."
                        className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !employeeId}
                      className="w-full rounded-[22px] bg-[linear-gradient(135deg,#082f49_0%,#0f4c81_100%)] px-6 py-4 text-xl font-black uppercase tracking-[0.08em] text-white shadow-[0_18px_40px_rgba(8,47,73,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Registrando..." : "Registrar Gol"}
                    </button>

                    {feedback ? (
                      <div
                        className={`rounded-[18px] border px-4 py-3 text-sm font-medium ${
                          feedbackTone === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                        }`}
                      >
                        {feedback}
                      </div>
                    ) : null}
                  </form>
                </article>

                <div className="space-y-6">
                  <article className="rounded-[30px] border border-white/80 bg-white/86 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.10)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                          Confrontos ao vivo
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.05em] text-slate-950">
                          Placar do dia
                        </h2>
                      </div>
                      <Link
                        href="/axion-league/arena"
                        target="_blank"
                        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
                      >
                        Abrir Arena TV
                      </Link>
                    </div>

                    <div className="mt-5 max-h-[420px] space-y-4 overflow-y-auto pr-2">
                      {snapshot.matches.map((match) => (
                        <div
                          key={match.id}
                          className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4"
                        >
                          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
                            <div>
                              <p className="mt-1 text-2xl font-black uppercase tracking-[0.04em] text-slate-950">
                                {match.player_a_name}
                              </p>
                            </div>
                            <div className="rounded-[18px] bg-[linear-gradient(135deg,#082f49_0%,#0f4c81_100%)] px-5 py-3 text-center text-white shadow-[0_14px_28px_rgba(8,47,73,0.20)]">
                              <p className="text-4xl font-black">
                                {match.player_a_score}
                                <span className="mx-2 text-sky-200/70">x</span>
                                {match.player_b_score}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="mt-1 text-2xl font-black uppercase tracking-[0.04em] text-slate-950">
                                {match.player_b_name}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 rounded-[18px] border border-slate-200/80 bg-white/90 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Ajuste {match.player_a_name}
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={scoreEdits[match.id]?.playerA ?? String(match.player_a_score)}
                                onChange={(event) =>
                                  setScoreEdits((current) => ({
                                    ...current,
                                    [match.id]: {
                                      playerA: event.target.value,
                                      playerB: current[match.id]?.playerB ?? String(match.player_b_score),
                                    },
                                  }))
                                }
                                className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Ajuste {match.player_b_name}
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={scoreEdits[match.id]?.playerB ?? String(match.player_b_score)}
                                onChange={(event) =>
                                  setScoreEdits((current) => ({
                                    ...current,
                                    [match.id]: {
                                      playerA: current[match.id]?.playerA ?? String(match.player_a_score),
                                      playerB: event.target.value,
                                    },
                                  }))
                                }
                                className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAdjustMatchScore(match.id)}
                              disabled={
                                adjustingMatchId !== null ||
                                scoreEdits[match.id]?.playerA === "" ||
                                scoreEdits[match.id]?.playerB === ""
                              }
                              className="rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {adjustingMatchId === match.id ? "Salvando..." : "Corrigir Placar"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-[30px] border border-white/80 bg-white/86 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.10)]">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Historico do dia</p>
                    <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-2">
                      {snapshot.events.length ? (
                        snapshot.events.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-4 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"
                          >
                            <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                              {formatTime(event.created_at)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-lg font-bold text-slate-950">
                                {event.employee_name} marcou{" "}
                                <span className="text-sky-700">
                                  {event.type === "sale" ? "Venda Nova" : "Recuperacao"}
                                </span>{" "}
                                (+{event.points})
                              </p>
                              {event.observation ? (
                                <p className="mt-1 text-sm text-slate-500">{event.observation}</p>
                              ) : null}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-500">
                          Nenhum evento registrado hoje.
                        </div>
                      )}
                    </div>
                  </article>

                  <article className="rounded-[30px] border border-white/80 bg-white/86 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.10)]">
                    <button
                      type="button"
                      onClick={() => setParticipantsOpen((current) => !current)}
                      className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-left transition hover:border-sky-200 hover:bg-sky-50"
                    >
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                          Participantes da Liga
                        </p>
                        <h3 className="mt-2 text-2xl font-black uppercase tracking-[0.05em] text-slate-950">
                          Selecionar comerciais e apelidos
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {participants.filter((participant) => participant.participating).length} participantes ativos
                        </p>
                      </div>
                      <span className="text-3xl font-black text-slate-400">
                        {participantsOpen ? "−" : "+"}
                      </span>
                    </button>

                    {participantsOpen ? (
                      <div className="mt-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <p className="max-w-3xl text-base text-slate-600">
                            A origem dos usuarios vem de `portal_users`, filtrada pela role `COMERCIAL` em `profiles`. Marque quem participa e personalize o nome exibido nos confrontos.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={handleSaveParticipants}
                              disabled={savingParticipants}
                              className="rounded-[18px] bg-[linear-gradient(135deg,#082f49_0%,#0f4c81_100%)] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_18px_40px_rgba(8,47,73,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingParticipants ? "Salvando..." : "Salvar Participantes"}
                            </button>
                            <button
                              type="button"
                              onClick={handleCloseRound}
                              disabled={roundActionLoading !== null}
                              className="rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {roundActionLoading === "close" ? "Encerrando..." : "Encerrar Rodada"}
                            </button>
                            <button
                              type="button"
                              onClick={handleResetChampionship}
                              disabled={roundActionLoading !== null}
                              className="rounded-[18px] border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {roundActionLoading === "reset" ? "Resetando..." : "Zerar Campeonato"}
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 grid max-h-[420px] gap-3 overflow-y-auto pr-2">
                          {participants.map((participant) => (
                            <div
                              key={participant.userId}
                              className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[auto_1fr_1fr]"
                            >
                              <label className="flex items-center gap-3 rounded-[16px] border border-white bg-white px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={participant.participating}
                                  onChange={(event) =>
                                    setParticipants((current) =>
                                      current.map((item) =>
                                        item.userId === participant.userId
                                          ? { ...item, participating: event.target.checked }
                                          : item,
                                      ),
                                    )
                                  }
                                  className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">
                                  Participa
                                </span>
                              </label>

                              <div className="rounded-[16px] border border-white bg-white px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                  Usuario do portal
                                </p>
                                <p className="mt-2 text-base font-semibold text-slate-900">{participant.email}</p>
                                <div className="mt-3 flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => fileInputsRef.current[participant.userId]?.click()}
                                    disabled={uploadingPhotoFor !== null}
                                    className="rounded-[14px] border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {uploadingPhotoFor === participant.userId ? "Enviando..." : "Importar Foto"}
                                  </button>
                                  {participant.photoUrl ? (
                                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-sky-100 bg-sky-50">
                                      <Image
                                        src={participant.photoUrl}
                                        alt={participant.nickname}
                                        width={40}
                                        height={40}
                                        unoptimized
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-400">Sem foto</span>
                                  )}
                                  <input
                                    ref={(element) => {
                                      fileInputsRef.current[participant.userId] = element;
                                    }}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(event) =>
                                      handleParticipantPhotoChange(
                                        participant.userId,
                                        event.target.files?.[0] ?? null,
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              <div className="rounded-[16px] border border-white bg-white px-4 py-3">
                                <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                  Apelido na Axion League
                                </label>
                                <input
                                  value={participant.nickname}
                                  onChange={(event) =>
                                    setParticipants((current) =>
                                      current.map((item) =>
                                        item.userId === participant.userId
                                          ? { ...item, nickname: event.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                  placeholder="Ex.: Biel, Joao, Nanda..."
                                  className="mt-2 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                </div>
                </section>
              </section>
            ) : null}

            {activeTab === "arena" ? (
              <section className="space-y-6">
                <article className="rounded-[30px] border border-white/80 bg-white/86 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.10)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                        Arena Ao Vivo
                      </p>
                      <h2 className="mt-2 text-4xl font-black uppercase tracking-[0.05em] text-slate-950">
                        Modo TV pronto para fullscreen
                      </h2>
                      <p className="mt-3 max-w-3xl text-base text-slate-600">
                        A tela dedicada remove sidebar e menus para virar um painel visual gigante com placares, atualizacao em tempo real e animacao de gol.
                      </p>
                    </div>
                    <Link
                      href="/axion-league/arena"
                      target="_blank"
                      className="rounded-[22px] bg-[linear-gradient(135deg,#082f49_0%,#0f4c81_100%)] px-6 py-4 text-lg font-black uppercase tracking-[0.08em] text-white shadow-[0_18px_40px_rgba(8,47,73,0.28)] transition hover:scale-[1.01]"
                    >
                      Abrir Arena Ao Vivo
                    </Link>
                  </div>
                </article>

                <AxionLeagueArenaBoard matches={snapshot.matches} round={snapshot.meta.round} compact />
              </section>
            ) : null}

            {activeTab === "table" ? (
              <section className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {snapshot.rankings.map((ranking) => (
                    <article
                      key={ranking.key}
                      className="rounded-[26px] border border-white/80 bg-white/86 p-5 shadow-[0_18px_48px_rgba(148,163,184,0.10)]"
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">
                        {ranking.icon} {ranking.label}
                      </p>
                      <p className="mt-3 text-3xl font-black uppercase tracking-[0.04em] text-slate-950">
                        {ranking.value}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{ranking.support}</p>
                    </article>
                  ))}
                </div>

                <article className="overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-[0_18px_48px_rgba(148,163,184,0.10)]">
                  <div className="border-b border-slate-200 px-6 py-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                      Classificacao Geral
                    </p>
                    <h2 className="mt-2 text-4xl font-black uppercase tracking-[0.05em] text-slate-950">
                      Tabela da temporada
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[1040px] w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Pos", "Colaborador", "Pts", "V", "E", "D", "Gols Pro", "Vendas", "Rec"].map((label) => (
                            <th
                              key={label}
                              className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.28em] text-slate-500"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {snapshot.table.map((row) => (
                          <tr key={row.employee_id} className="bg-white transition hover:bg-sky-50/60">
                            <td className="px-4 py-4 text-xl font-black text-slate-950">{row.position}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-sky-100 bg-sky-50">
                                  {row.photo_url ? (
                                    <Image
                                      src={row.photo_url}
                                      alt={row.employee_name}
                                      width={48}
                                      height={48}
                                      unoptimized
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-sm font-black text-sky-700">
                                      {row.employee_name.slice(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-lg font-black uppercase tracking-[0.04em] text-slate-950">
                                    {row.employee_name}
                                  </p>
                                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    OVR {row.overall}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-lg font-black text-slate-950">{row.points}</td>
                            <td className="px-4 py-4 text-base font-semibold text-slate-700">{row.wins}</td>
                            <td className="px-4 py-4 text-base font-semibold text-slate-700">{row.draws}</td>
                            <td className="px-4 py-4 text-base font-semibold text-slate-700">{row.losses}</td>
                            <td className="px-4 py-4 text-base font-semibold text-slate-700">{row.goals_for}</td>
                            <td className="px-4 py-4 text-base font-semibold text-slate-700">{row.sales}</td>
                            <td className="px-4 py-4 text-base font-semibold text-slate-700">{row.recoveries}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
