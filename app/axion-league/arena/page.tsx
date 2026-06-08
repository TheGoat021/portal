import { AxionLeagueArenaScreen } from "@/components/axion-league/AxionLeagueArenaScreen";
import {
  axionLeagueBodyFont,
  axionLeagueHeadlineFont,
} from "@/components/axion-league/leagueFonts";

export default function AxionLeagueArenaPage() {
  return (
    <div className={`${axionLeagueHeadlineFont.variable} ${axionLeagueBodyFont.variable} [font-family:var(--font-axion-league-body)]`}>
      <style>{`
        .axion-league-arena h1,
        .axion-league-arena h2,
        .axion-league-arena h3,
        .axion-league-arena h4,
        .axion-league-arena button,
        .axion-league-arena th {
          font-family: var(--font-axion-league-headline), sans-serif;
        }
      `}</style>
      <div className="axion-league-arena">
        <AxionLeagueArenaScreen />
      </div>
    </div>
  );
}
