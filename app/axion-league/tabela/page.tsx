import { AxionLeagueTableScreen } from "@/components/axion-league/AxionLeagueTableScreen";
import {
  axionLeagueBodyFont,
  axionLeagueHeadlineFont,
} from "@/components/axion-league/leagueFonts";

export default function AxionLeagueTablePage() {
  return (
    <div className={`${axionLeagueHeadlineFont.variable} ${axionLeagueBodyFont.variable} [font-family:var(--font-axion-league-body)]`}>
      <style>{`
        .axion-league-table h1,
        .axion-league-table h2,
        .axion-league-table h3,
        .axion-league-table h4,
        .axion-league-table button,
        .axion-league-table th {
          font-family: var(--font-axion-league-headline), sans-serif;
        }
      `}</style>
      <div className="axion-league-table">
        <AxionLeagueTableScreen />
      </div>
    </div>
  );
}
