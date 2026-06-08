import { AxionLeaguePortal } from "@/components/axion-league/AxionLeaguePortal";
import {
  axionLeagueBodyFont,
  axionLeagueHeadlineFont,
} from "@/components/axion-league/leagueFonts";

export default function AxionLeaguePage() {
  return (
    <div className={`${axionLeagueHeadlineFont.variable} ${axionLeagueBodyFont.variable} [font-family:var(--font-axion-league-body)]`}>
      <style>{`
        .axion-league-page h1,
        .axion-league-page h2,
        .axion-league-page h3,
        .axion-league-page h4,
        .axion-league-page button,
        .axion-league-page th {
          font-family: var(--font-axion-league-headline), sans-serif;
        }
      `}</style>
      <div className="axion-league-page">
        <AxionLeaguePortal />
      </div>
    </div>
  );
}
