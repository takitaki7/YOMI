/* ============================================================
   YOMI — core game logic
   Ported from the reference prototype (yomi.html). This module is
   pure and framework-agnostic: no DOM, no React. The UI layer
   (components/Game.tsx) drives it.
   ============================================================ */

import year1 from "@/data/words.year1.json";
import year2 from "@/data/words.year2.json";
import year3 from "@/data/words.year3.json";
import year4 from "@/data/words.year4.json";
import year5 from "@/data/words.year5.json";
import year6 from "@/data/words.year6.json";
import year7 from "@/data/words.year7.json";
import year8 from "@/data/words.year8.json";
import year9 from "@/data/words.year9.json";
import year10 from "@/data/words.year10.json";

export interface Word {
  /** Answer split into individual kana tiles, e.g. ["ね","こ"]. */
  kana: string[];
  romaji: string;
  mean: string;
  cat: string;
  /** Optional emoji hint; empty for abstract words. */
  emoji?: string;
  /** Optional example sentence (JP) + translation; empty for bulk entries. */
  exJp?: string;
  exTr?: string;
}

export interface CurriculumBand {
  year: number;
  name: string;
  note: string;
  pool: Word[];
}

export type TileState = "correct" | "present" | "absent";

export interface Puzzle {
  w: Word;
  year: number;
  name: string;
  note: string;
}

/* ------------------------------------------------------------
   10-YEAR CURRICULUM
   Rather than listing 3650 words, we define a curriculum: each of
   10 years is a difficulty band with its own vocabulary pool. The
   day number picks the year (harder as years pass) and then a word
   from that year's pool. Production simply grows each pool to ~365
   words — the schedule keeps working unchanged.
   ------------------------------------------------------------ */
export const CURRICULUM: CurriculumBand[] = [
  { year: 1, name: "Beginner", note: "hiragana · 2-char basics", pool: year1 as Word[] },
  { year: 2, name: "Elementary", note: "dakuten · 3-char words", pool: year2 as Word[] },
  { year: 3, name: "Upper Elementary", note: "small kana · everyday", pool: year3 as Word[] },
  { year: 4, name: "Pre-Intermediate", note: "adjectives · feelings", pool: year4 as Word[] },
  { year: 5, name: "Intermediate", note: "abstract nouns · verbs", pool: year5 as Word[] },
  { year: 6, name: "Upper Intermediate", note: "longer · compound words", pool: year6 as Word[] },
  { year: 7, name: "Pre-Advanced", note: "N3 vocabulary", pool: year7 as Word[] },
  { year: 8, name: "Advanced", note: "N2 vocabulary", pool: year8 as Word[] },
  { year: 9, name: "Upper Advanced", note: "N1 · nuanced words", pool: year9 as Word[] },
  { year: 10, name: "Fluent", note: "idiomatic · literary", pool: year10 as Word[] },
];

export const MAX_GUESSES = 6;
export const DAYS_PER_YEAR = 365;

/**
 * The public launch day. dayIndex 0 == this date (local time). Everyone
 * worldwide gets the same puzzle for a given local calendar day, and it
 * rolls over at local midnight. Fixed once launched — never move it, or
 * every player's day number and streak shifts.
 */
export const LAUNCH_DATE = "2026-01-01";

/** Milliseconds in a day. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Local-midnight timestamp (ms) for a given date. */
function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Absolute 0-based day index for a given moment, in the viewer's local
 * timezone. Uses calendar-day differences (not raw ms division) so DST
 * shifts never skip or repeat a day.
 */
export function dayIndexForDate(now: Date = new Date()): number {
  const [y, m, d] = LAUNCH_DATE.split("-").map((n) => parseInt(n, 10));
  const launch = localMidnight(new Date(y, m - 1, d));
  const today = localMidnight(now);
  const idx = Math.round((today - launch) / DAY_MS);
  return Math.max(0, idx);
}

/** Milliseconds remaining until the next local-midnight rollover. */
export function msUntilNextPuzzle(now: Date = new Date()): number {
  const next = localMidnight(now) + DAY_MS;
  return next - now.getTime();
}

/**
 * Map an absolute day index (0-based) → the day's puzzle. Years advance
 * every 365 days; within a year we walk the pool. Capped at year 10.
 */
export function puzzleForDay(dayIndex: number): Puzzle {
  let yi = Math.floor(dayIndex / DAYS_PER_YEAR);
  if (yi > CURRICULUM.length - 1) yi = CURRICULUM.length - 1; // cap at year 10
  const band = CURRICULUM[yi];
  const within = dayIndex % band.pool.length; // cycles the pool (prod: 365 unique)
  return { w: band.pool[within], year: band.year, name: band.name, note: band.note };
}

/* ------------------------------------------------------------
   Fifty-sounds keyboard + kana transforms
   ------------------------------------------------------------ */
export const KB: (string | null)[][] = [
  ["あ", "い", "う", "え", "お"],
  ["か", "き", "く", "け", "こ"],
  ["さ", "し", "す", "せ", "そ"],
  ["た", "ち", "つ", "て", "と"],
  ["な", "に", "ぬ", "ね", "の"],
  ["は", "ひ", "ふ", "へ", "ほ"],
  ["ま", "み", "む", "め", "も"],
  ["や", null, "ゆ", null, "よ"],
  ["ら", "り", "る", "れ", "ろ"],
  ["わ", null, null, null, "を"],
  ["ん", null, null, null, null],
];

export const RO: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "wo", ん: "n",
};

export const DAK: Record<string, string> = {
  か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご",
  さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ",
  た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど",
  は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ",
};

export const HAN: Record<string, string> = {
  は: "ぱ", ひ: "ぴ", ふ: "ぷ", へ: "ぺ", ほ: "ぽ",
};

export const SMALL: Record<string, string> = {
  や: "ゃ", ゆ: "ゅ", よ: "ょ", つ: "っ",
  あ: "ぁ", い: "ぃ", う: "ぅ", え: "ぇ", お: "ぉ", わ: "ゎ",
};

const rev = (o: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));

const DAK_R = rev(DAK);
const HAN_R = rev(HAN);
const SMALL_R = rev(SMALL);

/** Cycle the dakuten/handakuten state of a kana: か→が, は→ば→ぱ→は. */
export function dakutenToggle(k: string): string {
  if (DAK[k]) return DAK[k];
  if (DAK_R[k]) {
    const base = DAK_R[k];
    return HAN[base] || base;
  }
  if (HAN_R[k]) return HAN_R[k];
  return k;
}

/** Toggle a kana between full and small form: や↔ゃ, つ↔っ. */
export function smallToggle(k: string): string {
  return SMALL[k] || SMALL_R[k] || k;
}

/**
 * Wordle-style per-kana evaluation with correct duplicate handling:
 * greens are claimed first, then yellows draw from the remaining counts.
 */
export function evaluate(guess: string[], answer: string[]): TileState[] {
  const res: TileState[] = Array(guess.length).fill("absent");
  const counts: Record<string, number> = {};
  answer.forEach((k) => (counts[k] = (counts[k] || 0) + 1));
  guess.forEach((k, i) => {
    if (k === answer[i]) {
      res[i] = "correct";
      counts[k]--;
    }
  });
  guess.forEach((k, i) => {
    if (res[i] === "correct") return;
    if (counts[k] > 0) {
      res[i] = "present";
      counts[k]--;
    }
  });
  return res;
}

/**
 * Duolingo-style share text: lead with the streak, nothing else. No day
 * number, no score, no spoiler grid — just "N day streak" and the invite.
 */
export function shareText(opts: { streak: number }): string {
  const { streak } = opts;
  if (streak >= 1) {
    return `🔥 ${streak} day streak on YOMI — one Japanese word a day.`;
  }
  return `Learning Japanese one word a day on YOMI. 🇯🇵`;
}
