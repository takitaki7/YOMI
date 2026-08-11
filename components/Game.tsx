"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KB,
  MAX_GUESSES,
  RO,
  dakutenToggle,
  dayIndexForDate,
  evaluate,
  msUntilNextPuzzle,
  puzzleForDay,
  shareText,
  smallToggle,
  type Puzzle,
  type TileState,
} from "@/lib/game";
import {
  defaultState,
  loadState,
  recordOnboarding,
  recordResolution,
  saveState,
  type DayProgress,
  type SaveState,
} from "@/lib/storage";
import { track } from "@/lib/analytics";

// Share to the live site. Overridable via env for a future custom domain.
const SHARE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yomi-ten-wheat.vercel.app";

// A brand-new player gets a warm-up of this many words back-to-back before the
// one-word-a-day cadence begins — a stronger first session than a single word.
const ONBOARDING_TARGET = 10;

type Mode = "onboarding" | "daily";

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function Game() {
  const [mounted, setMounted] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("daily");
  const [onbIndex, setOnbIndex] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);

  const [cur, setCur] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [results, setResults] = useState<TileState[][]>([]);
  const [done, setDone] = useState(false);
  const [win, setWin] = useState(false);

  const [save, setSave] = useState<SaveState>(defaultState);
  const [showSheet, setShowSheet] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [countdown, setCountdown] = useState(0);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answerLen = puzzle ? puzzle.w.kana.length : 0;

  /* ---- toast ---- */
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2400);
  }, []);

  const resetBoard = useCallback(() => {
    setGuesses([]);
    setResults([]);
    setCur([]);
    setDone(false);
    setWin(false);
    setShowSheet(false);
  }, []);

  /* ---- decide onboarding vs daily and load the right puzzle ---- */
  const start = useCallback(
    (prior: SaveState) => {
      const di = dayIndexForDate();
      setDayIndex(di);

      if (!prior.onboardingDone) {
        const oi = Math.min(prior.onboardingIndex, ONBOARDING_TARGET - 1);
        const pz = puzzleForDay(oi);
        setMode("onboarding");
        setOnbIndex(oi);
        setPuzzle(pz);
        resetBoard();
        track({ name: "play_start", day: oi, year: pz.year });
        return;
      }

      setMode("daily");
      const pz = puzzleForDay(di);
      setPuzzle(pz);
      const p = prior.progress;
      if (p && p.day === di) {
        setGuesses(p.guesses);
        setResults(p.results);
        setDone(p.done);
        setWin(p.win);
        setCur([]);
        setShowSheet(false);
      } else {
        resetBoard();
        track({ name: "play_start", day: di, year: pz.year });
      }
    },
    [resetBoard]
  );

  useEffect(() => {
    const s = loadState();
    setSave(s);
    start(s);
    setCountdown(msUntilNextPuzzle());
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- countdown tick + midnight rollover (daily mode only) ---- */
  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setCountdown(msUntilNextPuzzle());
      const di = dayIndexForDate();
      if (mode === "daily" && di !== dayIndex) {
        const fresh = loadState();
        setSave(fresh);
        start(fresh);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mounted, dayIndex, mode, start]);

  /* ---- input handlers ---- */
  const place = useCallback(
    (k: string) => {
      if (done || !puzzle) return;
      setCur((c) => (c.length >= puzzle.w.kana.length ? c : [...c, k]));
    },
    [done, puzzle]
  );

  const modLast = useCallback(
    (fn: (k: string) => string) => {
      if (done) return;
      setCur((c) => {
        if (!c.length) return c;
        const i = c.length - 1;
        const nk = fn(c[i]);
        if (!nk || nk === c[i]) return c;
        const next = c.slice();
        next[i] = nk;
        return next;
      });
    },
    [done]
  );

  const backspace = useCallback(() => {
    if (done) return;
    setCur((c) => (c.length ? c.slice(0, -1) : c));
  }, [done]);

  const submit = useCallback(() => {
    if (done || !puzzle) return;
    if (cur.length !== puzzle.w.kana.length) return;

    const res = evaluate(cur.slice(), puzzle.w.kana);
    const nextGuesses = [...guesses, cur.slice()];
    const nextResults = [...results, res];
    setGuesses(nextGuesses);
    setResults(nextResults);
    setCur([]);
    track({ name: "guess", day: dayIndex, n: nextGuesses.length });

    const solved = res.every((x) => x === "correct");
    const out = solved || nextGuesses.length >= MAX_GUESSES;

    if (out) {
      setDone(true);
      setWin(solved);
      let updated: SaveState;
      if (mode === "onboarding") {
        updated = recordOnboarding(save, solved, nextGuesses.length, ONBOARDING_TARGET, dayIndex);
      } else {
        const progress: DayProgress = {
          day: dayIndex,
          guesses: nextGuesses,
          results: nextResults,
          done: true,
          win: solved,
        };
        updated = recordResolution(save, dayIndex, solved, nextGuesses.length, progress);
      }
      setSave(updated);
      saveState(updated);
      track({ name: "resolve", day: dayIndex, win: solved, guesses: nextGuesses.length });
      setTimeout(() => setShowSheet(true), 640);
    } else if (mode === "daily") {
      // persist in-progress daily board so a refresh keeps completed rows
      const progress: DayProgress = {
        day: dayIndex,
        guesses: nextGuesses,
        results: nextResults,
        done: false,
        win: false,
      };
      const updated = { ...save, progress };
      setSave(updated);
      saveState(updated);
    }
  }, [cur, done, guesses, results, dayIndex, puzzle, save, mode]);

  const nextOnboardingWord = useCallback(() => {
    const next = onbIndex + 1;
    if (next >= ONBOARDING_TARGET) return;
    const pz = puzzleForDay(next);
    setOnbIndex(next);
    setPuzzle(pz);
    resetBoard();
    track({ name: "play_start", day: next, year: pz.year });
  }, [onbIndex, resetBoard]);

  /* ---- physical keyboard: Enter / Backspace ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showSheet || showHelp) return;
      if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") {
        if (!done && puzzle && cur.length === puzzle.w.kana.length) submit();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [backspace, submit, cur, done, puzzle, showSheet, showHelp]);

  /* ---- share ---- */
  const openShare = useCallback(
    (kind: "x" | "ig" | "fb" | "tt") => {
      if (!puzzle) return;
      const text = shareText({
        dayIndex,
        levelName: puzzle.name,
        results,
        streak: save.streak,
      });
      track({ name: "share", day: dayIndex, channel: kind });

      const copy = () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text + "\n" + SHARE_URL).catch(() => {});
        }
      };

      if (kind === "x") {
        window.open(
          "https://twitter.com/intent/tweet?text=" +
            encodeURIComponent(text + "\n") +
            "&url=" +
            encodeURIComponent(SHARE_URL),
          "_blank",
          "noopener,noreferrer,width=600,height=560"
        );
      } else if (kind === "fb") {
        window.open(
          "https://www.facebook.com/sharer/sharer.php?u=" +
            encodeURIComponent(SHARE_URL) +
            "&quote=" +
            encodeURIComponent(text),
          "_blank",
          "noopener,noreferrer,width=600,height=560"
        );
      } else if (kind === "ig") {
        // Instagram has no web text/link intent — copy and open the app/site.
        copy();
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
        toast("Result copied — paste into your Instagram story");
      } else {
        // TikTok has no web share intent; opening tiktok.com is just noise, so
        // copy the result and let the player paste it into their own post.
        copy();
        toast("Result copied — paste it into your TikTok post");
      }
    },
    [dayIndex, puzzle, results, save.streak, toast]
  );

  /* ---- derived state ---- */
  const onbActive = mode === "onboarding";
  const onbMore = onbActive && done && save.onboardingIndex < ONBOARDING_TARGET;
  const locked = done && !onbMore; // daily done, or warm-up complete
  const onbComplete = onbActive && locked;

  const boardRows = useMemo(() => {
    if (!puzzle) return [];
    const rows: {
      cells: { ch: string; state?: TileState; filled: boolean; cur: boolean; reveal: boolean }[];
    }[] = [];
    for (let r = 0; r < MAX_GUESSES; r++) {
      const cells = [];
      const submittedGuess = guesses[r];
      const submittedRes = results[r];
      const isActiveRow = r === guesses.length && !done;
      for (let c = 0; c < answerLen; c++) {
        if (submittedGuess) {
          cells.push({
            ch: submittedGuess[c],
            state: submittedRes[c],
            filled: true,
            cur: false,
            reveal: true,
          });
        } else if (isActiveRow) {
          cells.push({
            ch: cur[c] || "",
            filled: !!cur[c],
            cur: c === cur.length,
            reveal: false,
          });
        } else {
          cells.push({ ch: "", filled: false, cur: false, reveal: false });
        }
      }
      rows.push({ cells });
    }
    return rows;
  }, [puzzle, guesses, results, cur, done, answerLen]);

  const enterDisabled = done || !puzzle || cur.length !== answerLen;

  /* ---- render ---- */
  return (
    <div className="ym-root">
      <div className="ym-sky" />
      <div className="ym-glow" />
      <div className="ym-haze" />

      <div className="ym-wrap">
        <div className="ym-top">
          <div className="ym-brand">
            <span className="en">YOMI</span>
          </div>
          <div className="ym-header-actions">
            <button
              className="ym-iconbtn"
              aria-label="How to play"
              onClick={() => setShowHelp(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.2 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.6 2.2-2.6 3.9" strokeLinecap="round" />
                <circle cx="12" cy="17.4" r="0.6" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <div className="ym-streak">
              <span className="dot" />
              <b>{mounted ? save.streak : 0}</b>&nbsp;day streak
            </div>
          </div>
        </div>

        {mounted && puzzle ? (
          <div className="ym-tag">
            {onbActive ? (
              <>
                <span className="ym-level">Warm-up</span> · Word{" "}
                <span className="day">{onbIndex + 1}</span> of {ONBOARDING_TARGET}
              </>
            ) : (
              <>
                Day <span className="day">{dayIndex + 1}</span> ·{" "}
                <span className="ym-level">Year {puzzle.year}</span>
              </>
            )}
          </div>
        ) : (
          <div className="ym-tag">&nbsp;</div>
        )}

        {mounted && puzzle && (
          <>
            <div className="ym-clue">
              <div className="ym-mean-label">Spell this word in hiragana</div>
              <div className="ym-mean">
                <span>{puzzle.w.mean}</span>
                {puzzle.w.emoji ? <span className="em">{puzzle.w.emoji}</span> : null}
              </div>
              <div className="ym-mora">{answerLen} characters</div>
            </div>

            <div className="ym-board">
              {boardRows.map((row, r) => (
                <div className="ym-row" key={r}>
                  {row.cells.map((cell, c) => {
                    const cls = ["ym-tile"];
                    if (cell.filled) cls.push("filled");
                    if (cell.cur) cls.push("cur");
                    if (cell.state) cls.push(cell.state);
                    if (cell.reveal) cls.push("reveal");
                    return (
                      <div
                        className={cls.join(" ")}
                        key={c}
                        style={cell.reveal ? { animationDelay: `${c * 0.08}s` } : undefined}
                      >
                        {cell.ch}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {onbMore ? (
              <div className="ym-done glass">
                <div className="title">{win ? "Nice!" : "Good try."}</div>
                <div className="sub">
                  Warm-up round — {ONBOARDING_TARGET - save.onboardingIndex} more{" "}
                  {ONBOARDING_TARGET - save.onboardingIndex === 1 ? "word" : "words"} to go.
                </div>
                <button className="ym-next" onClick={nextOnboardingWord}>
                  Next word →
                </button>
                <button className="ym-next" onClick={() => setShowSheet(true)}>
                  View this word
                </button>
              </div>
            ) : locked ? (
              <div className="ym-done glass">
                <div className="title">{win ? "Solved for today." : "That's today's word."}</div>
                <div className="sub">
                  {onbComplete
                    ? "Warm-up complete! From now on it's one new word a day — come back tomorrow and keep your streak going."
                    : "One word a day. Come back tomorrow for the next puzzle and keep your streak going."}
                </div>
                <div className="clock">{formatCountdown(countdown)}</div>
                <div className="clocklabel">Next word in</div>
                <button className="ym-next" onClick={() => setShowSheet(true)}>
                  View today&apos;s result
                </button>
              </div>
            ) : (
              <div className="ym-kb glass">
                <div className="ym-kb-label">Tap the hiragana chart</div>
                <div className="ym-grid">
                  {KB.flat().map((k, i) =>
                    k ? (
                      <button className="ym-key" key={i} onClick={() => place(k)}>
                        <span className="k">{k}</span>
                        <span className="r">{RO[k]}</span>
                      </button>
                    ) : (
                      <div className="ym-key empty" key={i} />
                    )
                  )}
                </div>
                <div className="ym-util">
                  <button
                    className="ym-ukey kana"
                    title="Add a dakuten mark"
                    onClick={() => modLast(dakutenToggle)}
                  >
                    ゛<span className="sub">ba</span>
                  </button>
                  <button
                    className="ym-ukey kana"
                    title="Make it a small kana"
                    onClick={() => modLast(smallToggle)}
                  >
                    小<span className="sub">ゃっ</span>
                  </button>
                  <button className="ym-ukey" onClick={backspace} aria-label="Backspace">
                    ⌫
                  </button>
                  <button className="ym-ukey enter" onClick={submit} disabled={enterDisabled}>
                    Enter
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* results sheet */}
      {mounted && puzzle && (
        <div
          className={"ym-reveal" + (showSheet ? " show" : "")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSheet(false);
          }}
        >
          <div className="ym-sheet">
            <div className={"ym-result " + (win ? "win" : "lose")}>
              {win
                ? guesses.length === 1
                  ? "Perfect — first try."
                  : `Solved in ${guesses.length} tries.`
                : "Out of tries — here's the word."}
            </div>
            <div className="ym-word">
              <div className="big">{puzzle.w.kana.join("")}</div>
              <div className="romaji">{puzzle.w.romaji}</div>
              <div className="meaning">{puzzle.w.mean}</div>
            </div>
            <div className="ym-ex">
              <div className="jp">{puzzle.w.exJp}</div>
              <div className="tr">{puzzle.w.exTr}</div>
            </div>

            <div className="ym-stats">
              <div className="ym-stat">
                <div className="n">{save.played}</div>
                <div className="l">Played</div>
              </div>
              <div className="ym-stat">
                <div className="n">
                  {save.played ? Math.round((save.wins / save.played) * 100) : 0}
                </div>
                <div className="l">Win %</div>
              </div>
              <div className="ym-stat">
                <div className="n">{save.streak}</div>
                <div className="l">Streak</div>
              </div>
              <div className="ym-stat">
                <div className="n">{save.bestStreak}</div>
                <div className="l">Best</div>
              </div>
            </div>

            {!onbMore && (
              <div className="ym-countdown">
                Next word in <b>{formatCountdown(countdown)}</b>
              </div>
            )}

            <div className="ym-sharelabel">Share your result</div>
            <div className="ym-share-grid">
              <button className="ym-sbtn x" aria-label="Share on X" onClick={() => openShare("x")}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.29L17.61 20.65Z" />
                </svg>
                <span>X</span>
              </button>
              <button
                className="ym-sbtn ig"
                aria-label="Share on Instagram"
                onClick={() => openShare("ig")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5.5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" stroke="none" />
                </svg>
                <span>Instagram</span>
              </button>
              <button
                className="ym-sbtn fb"
                aria-label="Share on Facebook"
                onClick={() => openShare("fb")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
                </svg>
                <span>Facebook</span>
              </button>
              <button
                className="ym-sbtn tt"
                aria-label="Share on TikTok"
                onClick={() => openShare("tt")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.2v12.9a2.6 2.6 0 0 1-2.6 2.5 2.6 2.6 0 1 1 .76-5.09V7.99a5.85 5.85 0 0 0-.76-.05A5.8 5.8 0 1 0 15.34 13.75V8.66a7.5 7.5 0 0 0 4.4 1.41V6.87a4.28 4.28 0 0 1-3.14-1.05Z" />
                </svg>
                <span>TikTok</span>
              </button>
            </div>

            {onbMore ? (
              <button
                className="ym-next"
                onClick={() => {
                  setShowSheet(false);
                  nextOnboardingWord();
                }}
              >
                Next word →
              </button>
            ) : (
              <button className="ym-next" onClick={() => setShowSheet(false)}>
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* help modal */}
      {showHelp && (
        <div
          className="ym-reveal centered show"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHelp(false);
          }}
        >
          <div className="ym-modal-card">
            <h2>How to play</h2>
            <div className="rule">
              Guess the day&apos;s Japanese word in {MAX_GUESSES} tries. Tap the hiragana chart to
              spell it; use ゛for dakuten (か→が) and 小 for small kana (や→ゃ).
            </div>
            <div className="rule">
              <span className="ym-swatch correct">ね</span>
              The kana is in the word and in the right spot.
            </div>
            <div className="rule">
              <span className="ym-swatch present">こ</span>
              The kana is in the word but in the wrong spot.
            </div>
            <div className="rule">
              <span className="ym-swatch absent">さ</span>
              The kana is not in the word.
            </div>
            <div className="rule">A new word every day. Keep your streak alive.</div>
            <button className="ym-next" onClick={() => setShowHelp(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      <div className={"ym-toast" + (toastMsg ? " show" : "")} role="status">
        {toastMsg}
      </div>
    </div>
  );
}
