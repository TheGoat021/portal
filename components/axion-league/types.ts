export type LeagueCardStats = {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
};

export type LeagueEmployee = {
  id: string;
  user_id?: string | null;
  name: string;
  source_email?: string | null;
  photo_url: string | null;
  card_image: string | null;
  overall: number;
  card_stats: LeagueCardStats;
  active: boolean;
};

export type LeagueMatch = {
  id: string;
  round: number;
  match_date: string;
  status: "scheduled" | "live" | "closed";
  season_key: string;
  closed_at: string | null;
  player_a_id: string;
  player_a_name: string;
  player_a_photo_url: string | null;
  player_a_card_image: string | null;
  player_a_overall: number;
  player_a_card_stats: LeagueCardStats;
  player_b_id: string;
  player_b_name: string;
  player_b_photo_url: string | null;
  player_b_card_image: string | null;
  player_b_overall: number;
  player_b_card_stats: LeagueCardStats;
  player_a_score: number;
  player_b_score: number;
  player_a_sales: number;
  player_b_sales: number;
  player_a_recoveries: number;
  player_b_recoveries: number;
};

export type LeagueStanding = {
  position: number;
  employee_id: string;
  employee_name: string;
  photo_url: string | null;
  card_image: string | null;
  overall: number;
  card_stats: LeagueCardStats;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  sales: number;
  recoveries: number;
  last_five?: Array<"win" | "draw" | "loss">;
};

export type LeagueRanking = {
  key: string;
  label: string;
  icon: string;
  value: string;
  support: string;
  employeeId?: string;
};

export type LeagueEvent = {
  id: string;
  created_at: string;
  type: "sale" | "recovery";
  points: number;
  observation: string | null;
  employee_id: string;
  match_id: string;
  employee_name: string;
  photo_url: string | null;
  card_image: string | null;
  overall: number;
  card_stats: LeagueCardStats;
  round: number;
  match_date: string;
  opponent_name: string;
};

export type LeagueSnapshot = {
  meta: {
    today: string;
    seasonKey: string;
    round: number;
    totalEmployees: number;
    lastUpdatedAt: string;
  };
  employees: LeagueEmployee[];
  matches: LeagueMatch[];
  table: LeagueStanding[];
  rankings: LeagueRanking[];
  events: LeagueEvent[];
  availableUsers: LeagueAvailableUser[];
};

export type LeagueAvailableUser = {
  userId: string;
  email: string;
  nickname: string;
  participating: boolean;
  employeeId: string | null;
  overall: number;
  photoUrl: string | null;
  cardImage: string | null;
};
