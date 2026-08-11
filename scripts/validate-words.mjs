/* Validates every vocabulary entry against the game's constraints so a typo
   can't ship a word the fifty-sounds keyboard cannot spell.
   Run with: npm run validate */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");

// Kana the keyboard can produce: base chart + dakuten + handakuten + small.
const BASE = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const DAK = "がぎぐげござじずぜぞだぢづでどばびぶべぼ";
const HAN = "ぱぴぷぺぽ";
const SMALL = "ゃゅょっぁぃぅぇぉゎ";
const REACHABLE = new Set([...BASE, ...DAK, ...HAN, ...SMALL]);

let errors = 0;
let total = 0;
const kanaSeen = new Map();

for (let y = 1; y <= 10; y++) {
  const file = join(DATA, `words.year${y}.json`);
  let arr;
  try {
    arr = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`year${y}: invalid JSON — ${e.message}`);
    errors++;
    continue;
  }
  if (!Array.isArray(arr)) {
    console.error(`year${y}: not an array`);
    errors++;
    continue;
  }
  arr.forEach((w, i) => {
    total++;
    const at = `year${y}[${i}] (${w.romaji || "?"})`;
    // Required on every entry. Examples (exJp/exTr) are optional — bulk
    // dictionary entries ship without a hand-written sentence.
    for (const field of ["kana", "romaji", "mean", "cat"]) {
      if (w[field] === undefined || w[field] === null || w[field] === "") {
        console.error(`${at}: missing "${field}"`);
        errors++;
      }
    }
    if (Array.isArray(w.kana)) {
      w.kana.forEach((k) => {
        if ([...k].length !== 1 || !REACHABLE.has(k)) {
          console.error(`${at}: kana tile "${k}" is not a single reachable kana`);
          errors++;
        }
      });
      const joined = w.kana.join("");
      // When an example is present, it must actually contain the word.
      if (w.exJp && !w.exJp.includes(joined)) {
        console.error(`${at}: example "${w.exJp}" does not contain the word "${joined}"`);
        errors++;
      }
      // The puzzle identity is the kana string — that's what must be unique.
      const prev = kanaSeen.get(joined);
      if (prev) {
        console.error(`${at}: duplicate word "${joined}", also in ${prev}`);
        errors++;
      } else {
        kanaSeen.set(joined, at);
      }
    } else {
      console.error(`${at}: "kana" must be an array`);
      errors++;
    }
  });
}

console.log(`Checked ${total} words across 10 years.`);
if (errors) {
  console.error(`\n${errors} problem(s) found.`);
  process.exit(1);
} else {
  console.log("All words valid ✓");
}
