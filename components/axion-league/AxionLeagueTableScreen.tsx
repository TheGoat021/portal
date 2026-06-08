"use client";

import Image from "next/image";

import styles from "./AxionLeague.module.css";
import type { LeagueStanding } from "./types";
import { useAxionLeagueLive } from "./useAxionLeagueLive";

function formatNow(isoDate?: string) {
  if (!isoDate) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoDate));
}

function TablePanel({ rows }: { rows: LeagueStanding[] }) {
  return (
    <section className={styles.tableTvPanel}>
      <header className={styles.tableTvHeader}>
        <div>Pos</div>
        <div>Colaborador</div>
        <div>Pts</div>
        <div>V</div>
        <div>E</div>
        <div>D</div>
        <div>Gols Pro</div>
        <div>Últimos 5</div>
      </header>

      <div className={styles.tableTvRows}>
        {rows.map((row) => (
          <div key={row.employee_id} className={styles.tableTvRow}>
            <div className={styles.tableTvPos}>{row.position}</div>
            <div className={styles.tableTvName}>
              <div className={styles.tableTvAvatar}>
                {row.photo_url ? (
                  <Image
                    src={row.photo_url}
                    alt={row.employee_name}
                    width={34}
                    height={34}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{row.employee_name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className={styles.tableTvNameText}>{row.employee_name}</span>
            </div>
            <div className={styles.tableTvPoints}>{row.points}</div>
            <div className={styles.tableTvCellCenter}>{row.wins}</div>
            <div className={styles.tableTvCellCenter}>{row.draws}</div>
            <div className={styles.tableTvCellCenter}>{row.losses}</div>
            <div className={`${styles.tableTvCellCenter} ${styles.tableTvGoals}`}>{row.goals_for}</div>
            <div className={styles.tableTvForm}>
              {(row.last_five ?? []).map((result, index) => (
                <span
                  key={`${row.employee_id}-${index}-${result}`}
                  className={`${styles.tableTvFormDot} ${
                    result === "win"
                      ? styles.tableTvFormWin
                      : result === "draw"
                        ? styles.tableTvFormDraw
                        : styles.tableTvFormLoss
                  }`}
                >
                  {result === "win" ? "✓" : result === "draw" ? "•" : "×"}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AxionLeagueTableScreen() {
  const { snapshot, loading, error } = useAxionLeagueLive();

  return (
    <div className={styles.arenaTv}>
      <main className={styles.arenaFrame}>
        <div className={styles.arenaLogo}>A</div>
        <div className={styles.cornerYellow} />

        <div className={styles.confettiA} />
        <div className={styles.confettiB} />
        <div className={styles.confettiC} />
        <div className={styles.confettiD} />

        <header className={styles.tvHeader}>
          <div className={styles.tvLeague}>AXION LEAGUE</div>
          <h1 className={styles.tvTitle}>
            TABELA <span>AO VIVO</span>
          </h1>
          <div className={styles.liveBadge}>● CLASSIFICAÇÃO</div>
        </header>

        <section className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>▣</div>
            <div>
              <small>RODADA</small>
              <strong>{snapshot?.meta.round ?? "--"}</strong>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>♛</div>
            <div>
              <small>PARTICIPANTES</small>
              <strong>{snapshot?.table.length ?? 0}</strong>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>◷</div>
            <div>
              <small>ATUALIZADO</small>
              <strong>{formatNow(snapshot?.meta.lastUpdatedAt)}</strong>
            </div>
          </div>
        </section>

        <section className={styles.tableTvContent}>
          {loading ? (
            <div className={styles.statePanel}>Carregando Tabela...</div>
          ) : error ? (
            <div className={styles.statePanel}>{error}</div>
          ) : snapshot ? (
            <>
              <div className={styles.rankingTvGrid}>
                {snapshot.rankings.slice(0, 5).map((ranking) => (
                  <article key={ranking.key} className={styles.rankingTvCard}>
                    <div className={styles.rankingTvLabel}>
                      {ranking.icon} {ranking.label}
                    </div>
                    <div className={styles.rankingTvValue}>{ranking.value}</div>
                    <div className={styles.rankingTvSupport}>{ranking.support}</div>
                  </article>
                ))}
              </div>

              <div className={styles.tableTvGrid}>
                <TablePanel rows={snapshot.table} />
              </div>
            </>
          ) : null}
        </section>

        <footer className={styles.ticker}>
          <div className={styles.tickerBall}>🏆</div>
          <div className={styles.tickerText}>
            AXION LEAGUE &nbsp; • &nbsp; CLASSIFICAÇÃO GERAL &nbsp; • &nbsp;
            <span>VITÓRIA VALE 3 PONTOS</span> &nbsp; • &nbsp; EMPATE VALE 1 PONTO
            &nbsp; • &nbsp; <span>GOLS PRÓ DECIDEM DESEMPATE</span> &nbsp; • &nbsp;
            AXION LEAGUE &nbsp; • &nbsp; CLASSIFICAÇÃO GERAL &nbsp; • &nbsp;
            <span>VITÓRIA VALE 3 PONTOS</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
