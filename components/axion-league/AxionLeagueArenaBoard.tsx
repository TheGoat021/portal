"use client";

import styles from "./AxionLeague.module.css";
import type { LeagueMatch } from "./types";

type AxionLeagueArenaBoardProps = {
  matches: LeagueMatch[];
  round: number;
  compact?: boolean;
  animated?: boolean;
};

export function AxionLeagueArenaBoard({
  matches,
  round: _round,
  compact: _compact = false,
  animated = false,
}: AxionLeagueArenaBoardProps) {
  void _round;
  void _compact;

  if (!matches.length) {
    return <div className={styles.statePanel}>Sem confrontos disponíveis</div>;
  }

  return (
    <div className={styles.matchesGrid}>
      {matches.map((match) => (
        <article
          key={match.id}
          className={`${styles.matchTvCard} ${animated ? styles.matchTvCardAnimated : ""}`}
        >
          <div className={styles.playerTv}>{match.player_a_name}</div>
          <div className={styles.scoreboxTv}>
            <small>PLACAR</small>
            <div className={styles.scoreTv}>
              {match.player_a_score} <span>x</span> {match.player_b_score}
            </div>
          </div>
          <div className={styles.playerTv}>{match.player_b_name}</div>
        </article>
      ))}
    </div>
  );
}
