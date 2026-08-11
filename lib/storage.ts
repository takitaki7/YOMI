/* ============================================================
   YOMI — persistence (localStorage)
   v1 keeps everything on-device: today's progress + streak. A future
   version can sync to a backend, but the schema here is the source of
   truth for the client.
   ============================================================ */

import type { TileState } from "./game";

const KEY = "yomi.v1";

export interface DayProgress {
  /** The dayIndex this progress belongs to. */
  day: number;
  /** Submitted guesses, each a kana array. */
  guesses: string[][];
  /** Evaluated states, parallel to guesses. */
  results: TileState[][];
  done: boolean;
  win: boolean;
}

export interface SaveState {
  version: 1;
  streak: number;
  /** dayIndex of the most recent day a game was won. */
  lastWinDay: number | null;
  /** dayIndex of the most recent day a game was resolved (win or loss). */
  lastResolvedDay: number | null;
  /** Aggregate stats for the results screen. */
  played: number;
  wins: number;
  /** Guess-count distribution for wins: index 0 == solved in 1. */
  dist: number[];
  bestStreak: number;
  /** The current/last day's board. */
  progress: DayProgress | null;
  /** How many first-session warm-up words the user has completed. */
  onboardingIndex: number;
  /** True once the warm-up is finished; from then on it's one word a day. */
  onboardingDone: boolean;
}

export function defaultState(): SaveState {
  return {
    version: 1,
    streak: 0,
    lastWinDay: null,
    lastResolvedDay: null,
    played: 0,
    wins: 0,
    dist: [0, 0, 0, 0, 0, 0],
    bestStreak: 0,
    progress: null,
    onboardingIndex: 0,
    onboardingDone: false,
  };
}

export function loadState(): SaveState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return defaultState();
    // Merge over defaults so older/partial saves stay valid.
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveState(state: SaveState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked (private mode) — game still works in-memory */
  }
}

/**
 * Fold a resolved game into the persisted state, updating streak and stats.
 * Idempotent for a given day: resolving the same day twice won't double-count.
 */
export function recordResolution(
  prev: SaveState,
  day: number,
  win: boolean,
  guessCount: number,
  progress: DayProgress
): SaveState {
  // Already recorded this exact day — just keep the latest board snapshot.
  if (prev.lastResolvedDay === day) {
    return { ...prev, progress };
  }

  let streak: number;
  if (win) {
    streak = prev.lastWinDay === day - 1 ? prev.streak + 1 : 1;
  } else {
    streak = 0;
  }

  const dist = prev.dist.slice();
  if (win && guessCount >= 1 && guessCount <= dist.length) {
    dist[guessCount - 1] += 1;
  }

  return {
    ...prev,
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    lastWinDay: win ? day : prev.lastWinDay,
    lastResolvedDay: day,
    played: prev.played + 1,
    wins: prev.wins + (win ? 1 : 0),
    dist,
    progress,
  };
}

/**
 * Fold a resolved warm-up word into the state. Streak increments per solved
 * word (a loss resets it). When the target is reached, onboarding ends and
 * today's daily is marked resolved so the player then joins the one-a-day
 * cadence, with streak anchored so tomorrow's win keeps it going.
 */
export function recordOnboarding(
  prev: SaveState,
  win: boolean,
  guessCount: number,
  target: number,
  realDay: number
): SaveState {
  const onboardingIndex = prev.onboardingIndex + 1;
  const onboardingDone = onboardingIndex >= target;
  const streak = win ? prev.streak + 1 : 0;

  const dist = prev.dist.slice();
  if (win && guessCount >= 1 && guessCount <= dist.length) {
    dist[guessCount - 1] += 1;
  }

  return {
    ...prev,
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    played: prev.played + 1,
    wins: prev.wins + (win ? 1 : 0),
    dist,
    onboardingIndex,
    onboardingDone,
    // On finishing the warm-up, lock today's daily and anchor the streak to
    // today so tomorrow's win continues it seamlessly. The done marker keeps
    // the lock across reloads.
    lastResolvedDay: onboardingDone ? realDay : prev.lastResolvedDay,
    lastWinDay: onboardingDone ? (win ? realDay : prev.lastWinDay) : prev.lastWinDay,
    progress: onboardingDone
      ? { day: realDay, guesses: [], results: [], done: true, win }
      : null,
  };
}
