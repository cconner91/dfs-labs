import "server-only";
import type { CurrentWeekGame } from "./nfl-data";
import { NFL_DATA_CACHE_TAG } from "./cache-tags";

// SportsGameOdds' public API (requires a free API key — sportsgameodds.com). Verified live before
// building this: billing is per-event returned, not per odds-line, so a weekly slate query is cheap.
const EVENTS_URL = "https://api.sportsgameodds.com/v2/events";

// Same cache tag/window as the ESPN calls in nfl-data.ts — one "Refresh odds" click (via
// updateTag) busts matchups and odds together, and normal navigation reuses the 6-hour cache
// instead of re-hitting both external APIs on every player "Add" click.
const CACHE = { next: { revalidate: 21600, tags: [NFL_DATA_CACHE_TAG] } };

/** "BREECE_HALL_1_NFL" -> "Breece Hall" — matched against ESPN's display names. */
function normalizePlayerId(playerId: string): string {
  return playerId
    .replace(/_\d+_NFL$/i, "")
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

interface BookmakerOdds {
  odds?: string;
  available?: boolean;
}

interface OddEntry {
  playerID?: string;
  statID?: string;
  periodID?: string;
  betTypeID?: string;
  sideID?: string;
  fairOdds?: string;
  byBookmaker?: Record<string, BookmakerOdds>;
}

function bestOdds(entry: OddEntry): number | null {
  const dk = entry.byBookmaker?.draftkings;
  if (dk?.available && dk.odds) return parseInt(dk.odds, 10);

  for (const book of Object.values(entry.byBookmaker ?? {})) {
    if (book.available && book.odds) return parseInt(book.odds, 10);
  }

  if (entry.fairOdds) return parseInt(entry.fairOdds, 10);
  return null;
}

/** Best-available anytime-TD-scorer odds this week, keyed by normalized player name. */
export async function getAnytimeTdOdds(games: CurrentWeekGame[]): Promise<Map<string, number>> {
  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;
  const result = new Map<string, number>();
  if (!apiKey || games.length === 0) return result;

  const kickoffs = games.map((g) => new Date(g.kickoff).getTime());
  const startsAfter = new Date(Math.min(...kickoffs) - 60 * 60 * 1000).toISOString();
  const startsBefore = new Date(Math.max(...kickoffs) + 60 * 60 * 1000).toISOString();

  const url = `${EVENTS_URL}?leagueID=NFL&startsAfter=${startsAfter}&startsBefore=${startsBefore}&limit=50`;

  try {
    const res = await fetch(url, { ...CACHE, headers: { "X-Api-Key": apiKey } });
    if (!res.ok) return result;
    const body = await res.json();

    for (const event of body.data ?? []) {
      const odds = event.odds as Record<string, OddEntry> | undefined;
      if (!odds) continue;

      for (const entry of Object.values(odds)) {
        // Pin the exact market by its structured fields, not the key string — "touchdowns" is
        // also used for per-quarter/per-half sub-markets (e.g. periodID "1q", "2h"), and matching
        // on key prefix/suffix alone let those silently overwrite the real full-game number.
        if (entry.statID !== "touchdowns") continue;
        if (entry.periodID !== "game") continue;
        if (entry.betTypeID !== "yn" || entry.sideID !== "yes") continue;
        if (!entry.playerID) continue;

        const value = bestOdds(entry);
        if (value === null) continue;

        result.set(normalizePlayerId(entry.playerID), value);
      }
    }
  } catch {
    // Supplementary data source — a failed/misconfigured call should never break the page.
    return result;
  }

  return result;
}
