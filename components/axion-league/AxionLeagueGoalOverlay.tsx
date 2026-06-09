"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import confetti from "canvas-confetti";
import Image from "next/image";

import styles from "./AxionLeague.module.css";
import type { LeagueEvent } from "./types";

type AxionLeagueGoalOverlayProps = {
  event: LeagueEvent | null;
};

const CARD_STAT_LABELS: Array<{ key: keyof LeagueEvent["card_stats"]; label: string }> = [
  { key: "pace", label: "PAC" },
  { key: "shooting", label: "SHO" },
  { key: "passing", label: "PAS" },
  { key: "dribbling", label: "DRI" },
  { key: "defense", label: "DEF" },
  { key: "physical", label: "PHY" },
];

export function AxionLeagueGoalOverlay({ event }: AxionLeagueGoalOverlayProps) {
  const [celebrationPhase, setCelebrationPhase] = useState(true);

  const crowdBars = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, index) => ({
        id: index,
        left: `${index * 3.6}%`,
        delay: `${(index % 7) * 0.12}s`,
        duration: `${0.7 + (index % 5) * 0.16}s`,
      })),
    [],
  );

  const fireworksBursts = useMemo(
    () => [
      { id: "left-main", left: "12%", top: "18%", delay: "0s", scale: 1.15, color: "#ffdf00" },
      { id: "left-high", left: "24%", top: "10%", delay: "0.35s", scale: 0.9, color: "#ffffff" },
      { id: "right-main", left: "78%", top: "20%", delay: "0.18s", scale: 1.12, color: "#ffdf00" },
      { id: "right-high", left: "68%", top: "9%", delay: "0.52s", scale: 0.88, color: "#5eead4" },
      { id: "top-center", left: "50%", top: "8%", delay: "0.25s", scale: 1.04, color: "#7dd3fc" },
    ],
    [],
  );

  useEffect(() => {
    if (!event?.id) {
      return;
    }

    const burst = (particleCount = 140, spread = 96) => {
      confetti({
        particleCount,
        spread,
        startVelocity: 48,
        origin: { x: 0.2, y: 0.45 },
        colors: ["#38bdf8", "#facc15", "#ffffff", "#1d4ed8", "#14b8a6"],
      });
      confetti({
        particleCount,
        spread,
        startVelocity: 48,
        origin: { x: 0.8, y: 0.45 },
        colors: ["#38bdf8", "#facc15", "#ffffff", "#1d4ed8", "#14b8a6"],
      });
    };

    burst();
    const followUp = window.setTimeout(() => burst(120, 88), 260);
    const finale = window.setTimeout(() => burst(100, 72), 1200);
    const phaseTimeout = window.setTimeout(() => setCelebrationPhase(false), 5000);

    let audioContext: AudioContext | null = null;
    let sourceNode: AudioBufferSourceNode | null = null;
    let gainNode: GainNode | null = null;
    let filterNode: BiquadFilterNode | null = null;

    const playCrowd = async () => {
      try {
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
          return;
        }

        audioContext = new AudioContextCtor();
        const sampleRate = audioContext.sampleRate;
        const durationSeconds = 5;
        const frameCount = sampleRate * durationSeconds;
        const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);

        let previous = 0;
        for (let index = 0; index < frameCount; index += 1) {
          const white = Math.random() * 2 - 1;
          previous = (previous + 0.02 * white) / 1.02;
          data[index] = previous * 2.4;
        }

        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;

        filterNode = audioContext.createBiquadFilter();
        filterNode.type = "lowpass";
        filterNode.frequency.value = 780;
        filterNode.Q.value = 0.7;

        gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.22);
        gainNode.gain.linearRampToValueAtTime(0.11, audioContext.currentTime + 3.8);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + durationSeconds);

        sourceNode.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        sourceNode.start();
        sourceNode.stop(audioContext.currentTime + durationSeconds);
      } catch {
        // Se o navegador bloquear audio, o overlay continua funcionando normalmente.
      }
    };

    void playCrowd();

    return () => {
      window.clearTimeout(followUp);
      window.clearTimeout(finale);
      window.clearTimeout(phaseTimeout);
      try {
        sourceNode?.stop();
      } catch {
        // ignorado
      }
      gainNode?.disconnect();
      filterNode?.disconnect();
      sourceNode?.disconnect();
      void audioContext?.close();
    };
  }, [event?.id]);

  if (!event) {
    return null;
  }

  const isSale = event.type === "sale";

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/86 p-6 backdrop-blur-md ${styles.overlayBackdrop}`}
    >
      <div className={`absolute inset-0 bg-white/10 ${styles.overlayFlash}`} />
      {celebrationPhase ? (
        <>
          <div className={styles.fireworksLeft} />
          <div className={styles.fireworksRight} />
          <div className={styles.fireworksTop} />
          {fireworksBursts.map((burst) => (
            <div
              key={burst.id}
              className={styles.fireworkBurst}
              style={
                {
                  left: burst.left,
                  top: burst.top,
                  animationDelay: burst.delay,
                  ["--burst-scale" as string]: burst.scale,
                  ["--burst-color" as string]: burst.color,
                } as CSSProperties
              }
            >
              <span className={styles.fireworkCore} />
              {Array.from({ length: 14 }).map((_, index) => (
                <span
                  key={`${burst.id}-${index}`}
                  className={styles.fireworkParticle}
                  style={
                    {
                      ["--angle" as string]: `${index * 25.7}deg`,
                      ["--particle-delay" as string]: `${index * 0.02}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          ))}
          <div className={styles.crowdBackdrop}>
            <div className={styles.crowdGlow} />
            <div className={styles.crowdWave} />
            <div className={styles.crowdWaveSecondary} />
            <div className={styles.crowdEqualizer}>
              {crowdBars.map((bar) => (
                <span
                  key={bar.id}
                  className={styles.crowdBar}
                  style={{
                    left: bar.left,
                    animationDelay: bar.delay,
                    animationDuration: bar.duration,
                  }}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {Array.from({ length: 18 }).map((_, index) => (
        <span
          key={index}
          className={styles.spark}
          style={{
            left: `${8 + (index % 6) * 16}%`,
            top: `${18 + (index % 3) * 18}%`,
            background:
              index % 2 === 0
                ? "radial-gradient(circle, rgba(255,255,255,0.95), rgba(56,189,248,0.18))"
                : "radial-gradient(circle, rgba(250,204,21,0.95), rgba(59,130,246,0.18))",
            ["--spark-x" as string]: `${(index % 2 === 0 ? 1 : -1) * (32 + index * 3)}px`,
            ["--spark-y" as string]: `${-110 - index * 8}px`,
          }}
        />
      ))}

      <div className={`relative mx-auto w-full max-w-5xl ${styles.overlayCard}`}>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className={`overflow-hidden rounded-[34px] border border-white/15 p-7 text-white shadow-[0_28px_80px_rgba(2,6,23,0.45)] ${celebrationPhase ? "bg-[linear-gradient(135deg,rgba(10,37,64,0.94),rgba(10,24,51,0.94))]" : "bg-[linear-gradient(135deg,rgba(7,24,40,0.96),rgba(11,38,66,0.96))]"}`}>
            <div className="flex flex-wrap items-center gap-4">
              <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.34em] text-cyan-100">
                Axion League
              </span>
              <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold uppercase tracking-[0.26em] text-white/80">
                Rodada {event.round}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.48em] text-cyan-200/82">
                {celebrationPhase ? "Evento ao vivo" : "Replay do lance"}
              </p>
              <h2 className="mt-3 text-6xl font-bold uppercase tracking-[0.06em] text-white lg:text-7xl">
                {isSale ? "GOOOOOL !!!" : "RECUPERACAO !!!"}
              </h2>
              <p className="mt-4 max-w-2xl text-xl text-slate-200/90 lg:text-2xl">
                {event.employee_name} acabou de balancar a rodada contra {event.opponent_name} com{" "}
                {isSale ? "Venda Nova (+2)" : "Recuperacao (+1)"}.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">
                  Tipo
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {isSale ? "Venda Nova" : "Recuperacao"}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">
                  Impacto
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">+{event.points} gol(s)</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">
                  Hora
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {new Intl.DateTimeFormat("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(event.created_at))}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[34px] border border-cyan-200/60 bg-[linear-gradient(155deg,#fefefe_0%,#edf6ff_38%,#e4f3ff_100%)] p-5 shadow-[0_20px_70px_rgba(14,116,144,0.28)]">
            <div className="relative h-full rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(224,242,254,0.96))] p-5">
              <div className="absolute inset-x-5 top-5 flex items-start justify-between">
                <div>
                  <p className="text-5xl font-black leading-none text-slate-900">{event.overall}</p>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-[0.36em] text-cyan-700">
                    OVR
                  </p>
                </div>
                <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.32em] text-cyan-700">
                  FUT Card
                </div>
              </div>

              <div className="mt-20 flex justify-center">
                <div className="relative h-44 w-44 overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(14,165,233,0.18),rgba(255,255,255,0.92))] shadow-[0_20px_40px_rgba(14,165,233,0.18)]">
                  {event.photo_url ? (
                    <Image
                      src={event.photo_url}
                      alt={event.employee_name}
                      width={176}
                      height={176}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-6xl font-black text-slate-300">
                      {event.employee_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-3xl font-black uppercase tracking-[0.08em] text-slate-950">
                  {event.employee_name}
                </h3>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.34em] text-slate-500">
                  Axion League Athlete
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {CARD_STAT_LABELS.map((stat) => (
                  <div
                    key={stat.key}
                    className="rounded-[18px] border border-white/80 bg-white/76 px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {event.card_stats[stat.key]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
