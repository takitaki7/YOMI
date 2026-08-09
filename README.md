# YOMI

**One Japanese word a day.** A daily hiragana Wordle for Japanese learners — spell the
day's word on the fifty-sounds keyboard, build a streak, and share your spoiler-free grid.

Built as a Next.js (App Router) + PWA site, migrated from the single-file prototype
(`yomi.html`) into a production project while keeping its design, game logic, and
10-year curriculum intact.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build (static)
npm run start    # serve the production build
npm run icons    # regenerate PWA icons + OG image (needs the sharp dev dep)
```

---

## Project structure

```
app/
  layout.tsx        Metadata, OGP/Twitter cards, PWA links, service-worker registration
  page.tsx          Renders <Game/>
  globals.css       Design system (Liquid Glass, Apple fonts, indigo accent)
components/
  Game.tsx          The game — client component: board, keyboard, sheet, persistence, rollover
lib/
  game.ts           Pure logic: curriculum, puzzleForDay, dayIndex date math, evaluate, kana maps
  storage.ts        localStorage persistence: streak, stats, today's board
  analytics.ts      Provider-agnostic event hook (DAU / shares / clear-rate)
data/
  words.year1.json … words.year10.json   Vocabulary pools, one file per difficulty band
public/
  manifest.webmanifest, sw.js             PWA manifest + offline service worker
  icon-*.png, apple-touch-icon.png, og.png  Generated brand assets
scripts/
  generate-icons.mjs                       Regenerates the PNGs above
```

---

## How the daily puzzle works

`dayIndex = ` calendar days between `LAUNCH_DATE` (in `lib/game.ts`) and the viewer's
local today. Everyone worldwide gets the same word for a given local calendar day, and
it rolls over at local midnight (the open tab rolls over automatically too).

`puzzleForDay(dayIndex)` picks the difficulty band — one **Year** per 365 days, capped at
Year 10 — then walks that year's pool. Grow each pool toward ~365 words and the whole
10-year schedule keeps working unchanged.

> **Do not move `LAUNCH_DATE` after launch** — every player's day number and streak is
> anchored to it.

---

## Adding vocabulary

Each word lives in `data/words.year{N}.json`:

```json
{
  "kana": ["ね", "こ"],
  "romaji": "neko",
  "mean": "cat",
  "cat": "Animal",
  "emoji": "🐱",
  "exJp": "ねこが かわいい。",
  "exTr": "The cat is cute."
}
```

- `kana` is the answer split into **individual kana tiles** — small kana (ゃ, っ) and
  dakuten kana (が, ぱ) are each their own tile (e.g. `きょう` → `["き","ょ","う"]`).
- `emoji` is optional; leave it `""` for abstract words.

Review checklist when generating words: kana-array correctness, romaji, meaning, natural
example sentence, difficulty-band fit, and de-duplication.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import** the repo — it auto-detects Next.js; no config needed.
3. (Optional) set `NEXT_PUBLIC_SITE_URL` to your production URL so OGP/canonical links
   are absolute. Defaults to `https://yomi.game`.
4. Deploy → you get a public URL. Every `git push` redeploys automatically.

The app is fully static/client-side, so hosting cost starts near zero.

### PWA / install

`public/manifest.webmanifest` + `public/sw.js` make the site installable and
offline-capable. On iOS, **Share → Add to Home Screen** gives the standalone app
experience. The service worker is network-first for navigations (fresh builds win when
online) and cache-first for static assets (works offline after the first visit).

---

## Status vs. the handoff

**Done**

- Prototype migrated to Next.js (App Router) + TypeScript, files split as specified.
- Design, game logic, and 10-year curriculum preserved; kana evaluation with correct
  duplicate handling.
- **Date-based one-a-day** puzzle with local-midnight rollover.
- **Persistence** (localStorage): today's board, streak, best streak, played / win-rate,
  guess distribution.
- **"Already played today"** resting screen with a live countdown to the next word.
- **PWA**: manifest, offline service worker, all icon sizes (incl. maskable), Add-to-Home.
- **OGP / Twitter** share-card image for viral previews.
- Spoiler-free 🟩🟨⬛ share to X / Instagram / Facebook / TikTok.
- Help modal, mini-stats, keyboard focus states, reduced-motion support.
- Analytics hook point (no third-party sends by default — wire a sink when ready).

**Remaining (production runway)**

- Grow each year's pool toward ~365 words (currently seeded; years 1–3 expanded).
- Wire the analytics sink to a real provider (Vercel Analytics / Plausible / custom).
- Optional future: cross-device sync (Vercel KV), katakana/kanji modes.
