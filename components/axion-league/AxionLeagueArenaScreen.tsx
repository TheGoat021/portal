"use client";

import styles from "./AxionLeague.module.css";
import { AxionLeagueArenaBoard } from "./AxionLeagueArenaBoard";
import { AxionLeagueGoalOverlay } from "./AxionLeagueGoalOverlay";
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

export function AxionLeagueArenaScreen() {
  const { snapshot, loading, error, goalOverlayEvent } = useAxionLeagueLive({
    enableGoalOverlay: true,
  });

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
            ARENA <span>AO VIVO</span>
          </h1>
          <div className={styles.liveBadge}>● AO VIVO</div>
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
              <small>JOGOS</small>
              <strong>{snapshot?.matches.length ?? 0}</strong>
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

        <section className={styles.matchesWrap}>
          {loading ? (
            <div className={styles.statePanel}>Carregando Arena...</div>
          ) : error ? (
            <div className={styles.statePanel}>{error}</div>
          ) : snapshot ? (
            <AxionLeagueArenaBoard
              matches={snapshot.matches}
              round={snapshot.meta.round}
              animated={Boolean(goalOverlayEvent)}
            />
          ) : null}
        </section>

        <footer className={styles.ticker}>
          <div className={styles.tickerBall}>⚽</div>
          <div className={styles.tickerText}>
            AXION LEAGUE &nbsp; • &nbsp; RODADA EM ANDAMENTO &nbsp; • &nbsp;
            <span>VENDAS NOVAS VALEM 2 GOLS</span> &nbsp; • &nbsp; RECUPERAÇÕES VALEM 1 GOL
            &nbsp; • &nbsp; <span>BORA VENDER!</span> &nbsp; • &nbsp; AXION LEAGUE &nbsp; •
            &nbsp; RODADA EM ANDAMENTO &nbsp; • &nbsp;
            <span>VENDAS NOVAS VALEM 2 GOLS</span>
          </div>
        </footer>
      </main>

      <AxionLeagueGoalOverlay event={goalOverlayEvent} />
    </div>
  );
}
