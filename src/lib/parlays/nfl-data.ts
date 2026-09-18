import "server-only";
import { getAnytimeTdOdds } from "./odds-data";
import { NFL_DATA_CACHE_TAG } from "./cache-tags";
import type { SkillPosition, WeeklyPlayerRow } from "./types";

// ESPN's public, unauthenticated site API — same data that powers espn.com, no API key.
// Verified live before building this: the scoreboard defaults to the current week automatically,
// and its `odds` block is sourced directly from DraftKings via ESPN's sportsbook partnership.
const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const ROSTER_URL = (teamAbbr: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamAbbr.toLowerCase()}/roster`;

// Cached for 6 hours — rosters/schedule barely move within a week, and without this every
// player "Add" click (which revalidates the page) was re-fetching ~32 team rosters live, making
// the UI feel sluggish. The "Refresh odds" button busts this on demand via updateTag (see actions.ts).
const CACHE = { next: { revalidate: 21600, tags: [NFL_DATA_CACHE_TAG] } };

const SKILL_POSITIONS: SkillPosition[] = ["QB", "RB", "WR", "TE"];

export interface CurrentWeekGame {
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  overUnder: number | null;
}

export async function getCurrentWeekGames(): Promise<CurrentWeekGame[]> {
  const res = await fetch(SCOREBOARD_URL, CACHE);
  if (!res.ok) throw new Error(`ESPN scoreboard returned ${res.status}`);
  const data = await res.json();

  const games: CurrentWeekGame[] = [];
  for (const event of data.events ?? []) {
    const competition = event.competitions?.[0];
    if (!competition || competition.status?.type?.name === "STATUS_FINAL") continue;

    const home = competition.competitors?.find((c: { homeAway: string }) => c.homeAway === "home");
    const away = competition.competitors?.find((c: { homeAway: string }) => c.homeAway === "away");
    if (!home || !away) continue;

    const overUnder = competition.odds?.[0]?.overUnder ?? null;

    games.push({
      homeTeam: home.team.abbreviation,
      awayTeam: away.team.abbreviation,
      kickoff: competition.date,
      overUnder,
    });
  }
  return games;
}

interface RosterPlayer {
  espn_id: string;
  name: string;
  position: SkillPosition;
}

export async function getRoster(teamAbbr: string): Promise<RosterPlayer[]> {
  const res = await fetch(ROSTER_URL(teamAbbr), CACHE);
  if (!res.ok) throw new Error(`ESPN roster for ${teamAbbr} returned ${res.status}`);
  const data = await res.json();

  const offense = (data.athletes ?? []).find((g: { position: string }) => g.position === "offense");
  if (!offense) return [];

  const players: RosterPlayer[] = [];
  for (const item of offense.items ?? []) {
    const abbr = item.position?.abbreviation;
    if (!SKILL_POSITIONS.includes(abbr)) continue;
    players.push({ espn_id: item.id, name: item.fullName, position: abbr as SkillPosition });
  }
  return players;
}

/** "Ja'Marr Chase" -> "ja'marr chase" — tolerant enough for exact-ish matching across sources. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Every QB/RB/WR/TE playing this week, with their real opponent/kickoff/O-U attached. */
export async function getWeeklyPlayerPool(): Promise<WeeklyPlayerRow[]> {
  const games = await getCurrentWeekGames();

  const rosterFetches = games.flatMap((game) => [
    { team: game.homeTeam, opponent: game.awayTeam, isHome: true, game },
    { team: game.awayTeam, opponent: game.homeTeam, isHome: false, game },
  ]);

  const [rosters, tdOdds] = await Promise.all([
    Promise.all(
      rosterFetches.map(async ({ team, opponent, isHome, game }) => {
        const players = await getRoster(team);
        return players.map(
          (p): WeeklyPlayerRow => ({
            espn_id: p.espn_id,
            name: p.name,
            position: p.position,
            team,
            opponent,
            is_home: isHome,
            game_time: game.kickoff,
            over_under: game.overUnder,
            american_odds: null,
          })
        );
      })
    ),
    getAnytimeTdOdds(games),
  ]);

  const oddsByName = new Map([...tdOdds.entries()].map(([name, odds]) => [normalizeName(name), odds]));

  return rosters.flat().map((player) => ({
    ...player,
    american_odds: oddsByName.get(normalizeName(player.name)) ?? null,
  }));
}
