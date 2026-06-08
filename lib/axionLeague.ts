import { supabaseAdmin } from "@/lib/supabaseAdmin";

const AXION_LEAGUE_TIMEZONE = "America/Sao_Paulo";
const AXION_LEAGUE_SEASON_KEY = "default";

type EmployeeRow = {
  id: string;
  user_id?: string | null;
  name: string;
  source_email?: string | null;
  photo_url: string | null;
  card_image: string | null;
  overall: number;
  card_stats: Record<string, number> | null;
  active: boolean;
};

type MatchRow = {
  id: string;
  round: number;
  player_a: string;
  player_b: string;
  match_date: string;
  status: "scheduled" | "live" | "closed";
};

type ScoreboardRow = {
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
  player_a_card_stats: Record<string, number> | null;
  player_b_id: string;
  player_b_name: string;
  player_b_photo_url: string | null;
  player_b_card_image: string | null;
  player_b_overall: number;
  player_b_card_stats: Record<string, number> | null;
  player_a_score: number;
  player_b_score: number;
  player_a_sales: number;
  player_b_sales: number;
  player_a_recoveries: number;
  player_b_recoveries: number;
};

type TableRow = {
  employee_id: string;
  employee_name: string;
  photo_url: string | null;
  card_image: string | null;
  overall: number;
  card_stats: Record<string, number> | null;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  sales: number;
  recoveries: number;
};

type EventFeedRow = {
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
  card_stats: Record<string, number> | null;
  round: number;
  match_date: string;
  opponent_name: string;
};

type RankingCard = {
  key: string;
  label: string;
  icon: string;
  value: string;
  support: string;
  employeeId?: string;
};

type PortalUserRow = {
  id: string;
  email: string | null;
};

type CommercialProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
};

type LeagueAvailableUser = {
  userId: string;
  email: string;
  nickname: string;
  participating: boolean;
  employeeId: string | null;
  overall: number;
  photoUrl: string | null;
  cardImage: string | null;
};

type HistoryResult = {
  employeeId: string;
  employeeName: string;
  goalsFor: number;
  goalsAgainst: number;
  outcome: "win" | "draw" | "loss";
  matchDate: string;
  round: number;
};

function getLeagueDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AXION_LEAGUE_TIMEZONE,
  }).format(new Date());
}

function toCardStats(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      pace: 72,
      shooting: 70,
      passing: 71,
      dribbling: 69,
      defense: 65,
      physical: 73,
    };
  }

  return value as Record<string, number>;
}

function buildDefaultNickname(email: string) {
  const localPart = email.split("@")[0] ?? "comercial";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shuffleEmployees(employees: EmployeeRow[]) {
  const shuffled = [...employees];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function buildDailyRandomPairings(employees: EmployeeRow[]) {
  const participants = employees.length % 2 === 0 ? shuffleEmployees(employees) : [...shuffleEmployees(employees), null];

  if (participants.length < 2) {
    return [];
  }
  const pairings: Array<{ playerA: EmployeeRow; playerB: EmployeeRow }> = [];

  for (let index = 0; index < participants.length; index += 2) {
    const left = participants[index];
    const right = participants[index + 1];

    if (!left || !right) {
      continue;
    }

    pairings.push({ playerA: left, playerB: right });
  }

  return pairings;
}

async function rebuildTodayMatches(today: string, activeEmployees: EmployeeRow[]) {
  const { data: todayGoals, error: todayGoalsError } = await supabaseAdmin
    .from("goals")
    .select("id, match_id, matches!inner(match_date, season_key)")
    .eq("matches.match_date", today)
    .eq("matches.season_key", AXION_LEAGUE_SEASON_KEY);

  if (todayGoalsError) {
    throw new Error(`Erro ao validar gols da rodada atual: ${todayGoalsError.message}`);
  }

  if ((todayGoals ?? []).length > 0) {
    return null;
  }

  const { error: deleteError } = await supabaseAdmin
    .from("matches")
    .delete()
    .eq("season_key", AXION_LEAGUE_SEASON_KEY)
    .eq("match_date", today);

  if (deleteError) {
    throw new Error(`Erro ao limpar confrontos antigos do dia: ${deleteError.message}`);
  }

  if (activeEmployees.length < 2) {
    return [];
  }

  const { data: latestMatch, error: latestMatchError } = await supabaseAdmin
    .from("matches")
    .select("round")
    .eq("season_key", AXION_LEAGUE_SEASON_KEY)
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestMatchError) {
    throw new Error(`Erro ao calcular nova rodada: ${latestMatchError.message}`);
  }

  const round = (latestMatch?.round ?? 0) + 1;
  const pairings = buildDailyRandomPairings(activeEmployees);

  if (!pairings.length) {
    return [];
  }

  const payload = pairings.map((pairing) => ({
    round,
    player_a: pairing.playerA.id,
    player_b: pairing.playerB.id,
    match_date: today,
    season_key: AXION_LEAGUE_SEASON_KEY,
    status: "live" as const,
  }));

  const { data: insertedMatches, error: insertError } = await supabaseAdmin
    .from("matches")
    .insert(payload)
    .select("id, round, player_a, player_b, match_date, status");

  if (insertError) {
    throw new Error(`Erro ao recriar confrontos do dia: ${insertError.message}`);
  }

  return (insertedMatches ?? []) as MatchRow[];
}

async function createFreshRoundForToday(today: string, activeEmployees: EmployeeRow[]) {
  if (activeEmployees.length < 2) {
    return [];
  }

  const { data: latestMatch, error: latestMatchError } = await supabaseAdmin
    .from("matches")
    .select("round")
    .eq("season_key", AXION_LEAGUE_SEASON_KEY)
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestMatchError) {
    throw new Error(`Erro ao calcular nova rodada: ${latestMatchError.message}`);
  }

  const round = (latestMatch?.round ?? 0) + 1;
  const pairings = buildDailyRandomPairings(activeEmployees);

  if (!pairings.length) {
    return [];
  }

  const payload = pairings.map((pairing) => ({
    round,
    player_a: pairing.playerA.id,
    player_b: pairing.playerB.id,
    match_date: today,
    season_key: AXION_LEAGUE_SEASON_KEY,
    status: "live" as const,
  }));

  const { data: insertedMatches, error: insertError } = await supabaseAdmin
    .from("matches")
    .insert(payload)
    .select("id, round, player_a, player_b, match_date, status");

  if (insertError) {
    throw new Error(`Erro ao criar nova rodada do dia: ${insertError.message}`);
  }

  return (insertedMatches ?? []) as MatchRow[];
}

async function closeStaleMatches(today: string) {
  const { data: staleMatches, error } = await supabaseAdmin
    .from("matches")
    .select("id")
    .eq("season_key", AXION_LEAGUE_SEASON_KEY)
    .in("status", ["scheduled", "live"])
    .lt("match_date", today);

  if (error) {
    throw new Error(`Erro ao buscar rodadas antigas: ${error.message}`);
  }

  if (!staleMatches?.length) {
    return;
  }

  const staleIds = staleMatches.map((match) => match.id);
  const { error: updateError } = await supabaseAdmin
    .from("matches")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .in("id", staleIds);

  if (updateError) {
    throw new Error(`Erro ao fechar rodadas antigas: ${updateError.message}`);
  }
}

async function ensureTodayMatches(today: string) {
  const { data: employees, error: employeesError } = await supabaseAdmin
    .from("employees")
    .select("id, user_id, name, source_email, photo_url, card_image, overall, card_stats, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (employeesError) {
    throw new Error(`Erro ao buscar colaboradores: ${employeesError.message}`);
  }

  const activeEmployees = (employees ?? []) as EmployeeRow[];

  if (activeEmployees.length < 2) {
    return [];
  }

  const { data: currentMatches, error: currentMatchesError } = await supabaseAdmin
    .from("matches")
    .select("id, round, player_a, player_b, match_date, status")
    .eq("season_key", AXION_LEAGUE_SEASON_KEY)
    .eq("match_date", today)
    .in("status", ["scheduled", "live"])
    .order("created_at", { ascending: true });

  if (currentMatchesError) {
    throw new Error(`Erro ao consultar confrontos atuais: ${currentMatchesError.message}`);
  }

  if (currentMatches?.length) {
    return currentMatches as MatchRow[];
  }

  return createFreshRoundForToday(today, activeEmployees);
}

export async function ensureLeagueState() {
  const today = getLeagueDate();
  await closeStaleMatches(today);
  const todayMatches = await ensureTodayMatches(today);
  return {
    today,
    round: todayMatches[0]?.round ?? 1,
  };
}

function buildHistory(scoreboards: ScoreboardRow[]) {
  const history: HistoryResult[] = [];

  for (const match of scoreboards.filter((item) => item.status === "closed")) {
    const aOutcome =
      match.player_a_score > match.player_b_score
        ? "win"
        : match.player_a_score < match.player_b_score
          ? "loss"
          : "draw";
    const bOutcome =
      match.player_b_score > match.player_a_score
        ? "win"
        : match.player_b_score < match.player_a_score
          ? "loss"
          : "draw";

    history.push({
      employeeId: match.player_a_id,
      employeeName: match.player_a_name,
      goalsFor: match.player_a_score,
      goalsAgainst: match.player_b_score,
      outcome: aOutcome,
      matchDate: match.match_date,
      round: match.round,
    });
    history.push({
      employeeId: match.player_b_id,
      employeeName: match.player_b_name,
      goalsFor: match.player_b_score,
      goalsAgainst: match.player_a_score,
      outcome: bOutcome,
      matchDate: match.match_date,
      round: match.round,
    });
  }

  return history.sort((left, right) => {
    if (left.matchDate === right.matchDate) {
      return left.round - right.round;
    }

    return left.matchDate.localeCompare(right.matchDate);
  });
}

function buildLastFiveMap(scoreboards: ScoreboardRow[]) {
  const history = buildHistory(scoreboards);
  const grouped = history.reduce<Record<string, Array<"win" | "draw" | "loss">>>((accumulator, item) => {
    if (!accumulator[item.employeeId]) {
      accumulator[item.employeeId] = [];
    }

    accumulator[item.employeeId].push(item.outcome);
    return accumulator;
  }, {});

  return new Map(
    Object.entries(grouped).map(([employeeId, outcomes]) => [employeeId, outcomes.slice(-5)]),
  );
}

function computeRankings(table: TableRow[], scoreboards: ScoreboardRow[]) {
  const rankings: RankingCard[] = [];
  const leader = table[0];

  if (leader) {
    rankings.push({
      key: "leader",
      label: "Lider Geral",
      icon: "🏆",
      value: leader.employee_name,
      support: `${leader.points} pts · ${leader.goals_for} gols`,
      employeeId: leader.employee_id,
    });
  }

  const topScorer = [...table].sort((left, right) => {
    if (right.goals_for === left.goals_for) {
      return right.sales - left.sales;
    }

    return right.goals_for - left.goals_for;
  })[0];

  if (topScorer) {
    rankings.push({
      key: "scorer",
      label: "Artilheiro",
      icon: "⚽",
      value: topScorer.employee_name,
      support: `${topScorer.goals_for} gols marcados`,
      employeeId: topScorer.employee_id,
    });
  }

  const recoveryKing = [...table].sort((left, right) => right.recoveries - left.recoveries)[0];
  if (recoveryKing) {
    rankings.push({
      key: "recovery-king",
      label: "Rei das Recuperacoes",
      icon: "🛡️",
      value: recoveryKing.employee_name,
      support: `${recoveryKing.recoveries} recuperacoes`,
      employeeId: recoveryKing.employee_id,
    });
  }

  const history = buildHistory(scoreboards);
  const groupedHistory = history.reduce<Record<string, HistoryResult[]>>((accumulator, entry) => {
    if (!accumulator[entry.employeeId]) {
      accumulator[entry.employeeId] = [];
    }

    accumulator[entry.employeeId].push(entry);
    return accumulator;
  }, {});

  let streakWinner: { employeeId: string; employeeName: string; streak: number } | null = null;
  let evolutionWinner: { employeeId: string; employeeName: string; delta: number } | null = null;

  for (const [employeeId, entries] of Object.entries(groupedHistory)) {
    let currentStreak = 0;
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (entries[index].outcome !== "win") {
        break;
      }

      currentStreak += 1;
    }

    if (!streakWinner || currentStreak > streakWinner.streak) {
      streakWinner = {
        employeeId,
        employeeName: entries[0]?.employeeName ?? "Colaborador",
        streak: currentStreak,
      };
    }

    const latest = entries.at(-1);
    if (!latest) {
      continue;
    }

    const previousEntries = entries.slice(Math.max(entries.length - 4, 0), entries.length - 1);
    const baseline =
      previousEntries.length > 0
        ? previousEntries.reduce((sum, item) => sum + item.goalsFor, 0) / previousEntries.length
        : 0;
    const delta = latest.goalsFor - baseline;

    if (!evolutionWinner || delta > evolutionWinner.delta) {
      evolutionWinner = {
        employeeId,
        employeeName: latest.employeeName,
        delta,
      };
    }
  }

  if (streakWinner) {
    rankings.push({
      key: "streak",
      label: "Melhor Sequencia",
      icon: "🔥",
      value: streakWinner.employeeName,
      support: `${streakWinner.streak} vitorias seguidas`,
      employeeId: streakWinner.employeeId,
    });
  }

  if (evolutionWinner) {
    rankings.push({
      key: "evolution",
      label: "Maior Evolucao",
      icon: "📈",
      value: evolutionWinner.employeeName,
      support: `+${evolutionWinner.delta.toFixed(1)} gols vs media recente`,
      employeeId: evolutionWinner.employeeId,
    });
  }

  return rankings;
}

export async function getLeagueAvailableUsers(): Promise<LeagueAvailableUser[]> {
  const [
    { data: commercialProfiles, error: profilesError },
    { data: portalUsers, error: usersError },
    { data: employees, error: employeesError },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, email, role")
      .eq("role", "COMERCIAL")
      .order("email", { ascending: true }),
    supabaseAdmin
      .from("portal_users")
      .select("id, email")
      .order("email", { ascending: true }),
    supabaseAdmin
      .from("employees")
      .select("id, user_id, name, source_email, photo_url, card_image, overall, card_stats, active"),
  ]);

  if (profilesError) {
    throw new Error(`Erro ao buscar perfis comerciais: ${profilesError.message}`);
  }

  if (usersError) {
    throw new Error(`Erro ao buscar usuarios do portal: ${usersError.message}`);
  }

  if (employeesError) {
    throw new Error(`Erro ao buscar participantes da liga: ${employeesError.message}`);
  }

  const portalUserMap = new Map(
    ((portalUsers ?? []) as PortalUserRow[]).map((user) => [user.id, user]),
  );
  const employeeByUserId = new Map(
    ((employees ?? []) as EmployeeRow[])
      .filter((employee) => Boolean(employee.user_id))
      .map((employee) => [employee.user_id as string, employee]),
  );

  return ((commercialProfiles ?? []) as CommercialProfileRow[])
    .map((profile) => {
      const portalUser = portalUserMap.get(profile.id);
      const email = portalUser?.email ?? profile.email ?? "";

      if (!email) {
        return null;
      }

      const employee = employeeByUserId.get(profile.id);

      return {
        userId: profile.id,
        email,
        nickname: employee?.name ?? buildDefaultNickname(email),
        participating: employee?.active ?? false,
        employeeId: employee?.id ?? null,
        overall: employee?.overall ?? 75,
        photoUrl: employee?.photo_url ?? null,
        cardImage: employee?.card_image ?? null,
      };
    })
    .filter((item): item is LeagueAvailableUser => Boolean(item))
    .sort((left, right) => left.email.localeCompare(right.email, "pt-BR"));
}

export async function getLeagueSnapshot() {
  const { today, round } = await ensureLeagueState();
  const availableUsersPromise = getLeagueAvailableUsers();

  const [{ data: scoreboards, error: scoreboardError }, { data: table, error: tableError }, { data: events, error: eventsError }, { data: employees, error: employeesError }] =
    await Promise.all([
      supabaseAdmin
        .from("axion_league_match_scoreboard")
        .select("*")
        .eq("season_key", AXION_LEAGUE_SEASON_KEY)
        .order("match_date", { ascending: false })
        .order("round", { ascending: false })
        .order("player_a_name", { ascending: true }),
      supabaseAdmin
        .from("axion_league_table")
        .select("*")
        .order("points", { ascending: false })
        .order("goals_for", { ascending: false })
        .order("wins", { ascending: false })
        .order("employee_name", { ascending: true }),
      supabaseAdmin
        .from("axion_league_event_feed")
        .select("*")
        .eq("match_date", today)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("employees")
        .select("id, user_id, name, source_email, photo_url, card_image, overall, card_stats, active")
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

  if (scoreboardError) {
    throw new Error(`Erro ao carregar confrontos: ${scoreboardError.message}`);
  }

  if (tableError) {
    throw new Error(`Erro ao carregar tabela: ${tableError.message}`);
  }

  if (eventsError) {
    throw new Error(`Erro ao carregar eventos: ${eventsError.message}`);
  }

  if (employeesError) {
    throw new Error(`Erro ao carregar colaboradores: ${employeesError.message}`);
  }

  const scoreboardRows = (scoreboards ?? []) as ScoreboardRow[];
  const todayOpenMatches = scoreboardRows.filter(
    (item) => item.match_date === today && (item.status === "live" || item.status === "scheduled"),
  );
  const activeRound =
    todayOpenMatches.reduce((maxRound, match) => Math.max(maxRound, match.round), 0) || round;
  const todayMatches = todayOpenMatches.filter((item) => item.round === activeRound);
  const tableRows = (table ?? []) as TableRow[];
  const lastFiveMap = buildLastFiveMap(scoreboardRows);
  const activeEmployees = (employees ?? []) as EmployeeRow[];
  const availableUsers = await availableUsersPromise;
  const enrichedEmployees = activeEmployees.map((employee) => ({
    ...employee,
    card_stats: toCardStats(employee.card_stats),
  }));

  const rowsWithStandings = tableRows.map((row, index) => ({
    position: index + 1,
    ...row,
    card_stats: toCardStats(row.card_stats),
    last_five: lastFiveMap.get(row.employee_id) ?? [],
  }));

  return {
    meta: {
      today,
      seasonKey: AXION_LEAGUE_SEASON_KEY,
      round: activeRound,
      totalEmployees: enrichedEmployees.length,
      lastUpdatedAt: new Date().toISOString(),
    },
    employees: enrichedEmployees,
    matches: todayMatches.map((match) => ({
      ...match,
      player_a_card_stats: toCardStats(match.player_a_card_stats),
      player_b_card_stats: toCardStats(match.player_b_card_stats),
    })),
    table: rowsWithStandings,
    rankings: computeRankings(tableRows, scoreboardRows),
    events: ((events ?? []) as EventFeedRow[]).map((event) => ({
      ...event,
      card_stats: toCardStats(event.card_stats),
    })),
    availableUsers,
  };
}

export async function registerLeagueGoal(input: {
  employeeId: string;
  type: "sale" | "recovery";
  observation?: string;
}) {
  const { today } = await ensureLeagueState();
  const points = input.type === "sale" ? 2 : 1;

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id")
    .eq("season_key", AXION_LEAGUE_SEASON_KEY)
    .eq("match_date", today)
    .eq("status", "live")
    .or(`player_a.eq.${input.employeeId},player_b.eq.${input.employeeId}`)
    .limit(1)
    .maybeSingle();

  if (matchError) {
    throw new Error(`Erro ao localizar confronto do colaborador: ${matchError.message}`);
  }

  if (!match) {
    throw new Error("Nenhum confronto ativo encontrado para este colaborador hoje.");
  }

  const { data: goal, error: insertError } = await supabaseAdmin
    .from("goals")
    .insert({
      employee_id: input.employeeId,
      match_id: match.id,
      type: input.type,
      points,
      observation: input.observation?.trim() || null,
    })
    .select("id, employee_id, match_id, type, points, observation, created_at")
    .single();

  if (insertError) {
    throw new Error(`Erro ao registrar gol: ${insertError.message}`);
  }

  return goal;
}

export async function saveLeagueParticipants(
  participants: Array<{ userId: string; nickname: string; participating: boolean }>,
) {
  const today = getLeagueDate();
  const availableUsers = await getLeagueAvailableUsers();
  const availableById = new Map(availableUsers.map((user) => [user.userId, user]));
  const { data: existingEmployees, error: existingEmployeesError } = await supabaseAdmin
    .from("employees")
    .select("id, user_id");

  if (existingEmployeesError) {
    throw new Error(`Erro ao carregar participantes existentes: ${existingEmployeesError.message}`);
  }

  const employeeByUserId = new Map(
    ((existingEmployees ?? []) as Array<{ id: string; user_id: string | null }>)
      .filter((employee) => Boolean(employee.user_id))
      .map((employee) => [employee.user_id as string, employee.id]),
  );

  for (const participant of participants) {
    const availableUser = availableById.get(participant.userId);
    if (!availableUser) {
      continue;
    }

    const nickname = participant.nickname.trim() || buildDefaultNickname(availableUser.email);

    const payload = {
      user_id: participant.userId,
      source_email: availableUser.email,
      name: nickname,
      active: participant.participating,
      overall: availableUser.overall,
      photo_url: availableUser.photoUrl,
      card_image: availableUser.cardImage,
    };

    const existingEmployeeId = employeeByUserId.get(participant.userId);
    const { error } = existingEmployeeId
      ? await supabaseAdmin.from("employees").update(payload).eq("id", existingEmployeeId)
      : await supabaseAdmin.from("employees").insert(payload);

    if (error) {
      throw new Error(`Erro ao salvar participante ${availableUser.email}: ${error.message}`);
    }
  }

  const { data: activeEmployees, error: activeEmployeesError } = await supabaseAdmin
    .from("employees")
    .select("id, user_id, name, source_email, photo_url, card_image, overall, card_stats, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (activeEmployeesError) {
    throw new Error(`Erro ao atualizar elenco ativo da rodada: ${activeEmployeesError.message}`);
  }

  await rebuildTodayMatches(today, (activeEmployees ?? []) as EmployeeRow[]);

  return getLeagueAvailableUsers();
}

export async function updateLeagueParticipantPhoto(input: {
  userId: string;
  photoUrl: string;
}) {
  const availableUsers = await getLeagueAvailableUsers();
  const availableUser = availableUsers.find((user) => user.userId === input.userId);

  if (!availableUser) {
    throw new Error("Participante comercial nao encontrado.");
  }

  const nickname = availableUser.nickname.trim() || buildDefaultNickname(availableUser.email);
  const { data: existingEmployee, error: existingEmployeeError } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existingEmployeeError) {
    throw new Error(`Erro ao localizar participante para foto: ${existingEmployeeError.message}`);
  }

  const payload = {
    user_id: input.userId,
    source_email: availableUser.email,
    name: nickname,
    active: availableUser.participating,
    overall: availableUser.overall,
    photo_url: input.photoUrl,
    card_image: availableUser.cardImage,
  };

  const { error } = existingEmployee?.id
    ? await supabaseAdmin.from("employees").update(payload).eq("id", existingEmployee.id)
    : await supabaseAdmin.from("employees").insert(payload);

  if (error) {
    throw new Error(`Erro ao salvar foto do participante: ${error.message}`);
  }

  return getLeagueAvailableUsers();
}

export async function closeCurrentLeagueRound() {
  const today = getLeagueDate();
  const closedAt = new Date().toISOString();
  const { data: activeEmployees, error: activeEmployeesError } = await supabaseAdmin
    .from("employees")
    .select("id, user_id, name, source_email, photo_url, card_image, overall, card_stats, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (activeEmployeesError) {
    throw new Error(`Erro ao carregar participantes ativos: ${activeEmployeesError.message}`);
  }

  const { data: matches, error: matchesError } = await supabaseAdmin
    .from("matches")
    .select("id")
    .eq("season_key", AXION_LEAGUE_SEASON_KEY)
    .eq("match_date", today)
    .in("status", ["scheduled", "live"]);

  if (matchesError) {
    throw new Error(`Erro ao localizar rodada atual: ${matchesError.message}`);
  }

  if (!matches?.length) {
    const nextMatches = await ensureTodayMatches(today);
    return {
      closedMatches: 0,
      nextRound: nextMatches[0]?.round ?? null,
    };
  }

  const { error: updateError } = await supabaseAdmin
    .from("matches")
    .update({
      status: "closed",
      closed_at: closedAt,
    })
    .in("id", matches.map((match) => match.id));

  if (updateError) {
    throw new Error(`Erro ao encerrar rodada atual: ${updateError.message}`);
  }

  const nextMatches = await createFreshRoundForToday(today, (activeEmployees ?? []) as EmployeeRow[]);

  return {
    closedMatches: matches.length,
    nextRound: nextMatches[0]?.round ?? null,
  };
}

export async function resetLeagueChampionship() {
  const { error: goalsError } = await supabaseAdmin.from("goals").delete().not("id", "is", null);
  if (goalsError) {
    throw new Error(`Erro ao limpar gols: ${goalsError.message}`);
  }

  const { error: matchesError } = await supabaseAdmin.from("matches").delete().not("id", "is", null);
  if (matchesError) {
    throw new Error(`Erro ao limpar confrontos: ${matchesError.message}`);
  }

  const today = getLeagueDate();
  const freshMatches = await ensureTodayMatches(today);

  return {
    ok: true,
    nextRound: freshMatches[0]?.round ?? null,
  };
}

export async function getLeagueEventById(goalId: string) {
  const { data, error } = await supabaseAdmin
    .from("axion_league_event_feed")
    .select("*")
    .eq("id", goalId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar evento: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    ...(data as EventFeedRow),
    card_stats: toCardStats((data as EventFeedRow).card_stats),
  };
}
