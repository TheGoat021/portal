import { Barlow_Condensed, Rajdhani } from "next/font/google";

export const axionLeagueHeadlineFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-axion-league-headline",
});

export const axionLeagueBodyFont = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-axion-league-body",
});
