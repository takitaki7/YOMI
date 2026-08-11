/* ============================================================
   YOMI — analytics (thin hook point)
   The handoff calls for measuring DAU, shares and clear-rate from
   day one, since those are the metrics an acquirer evaluates. This
   module is intentionally provider-agnostic: it batches events into a
   queue and, if a sink is registered (e.g. a Vercel Analytics /
   Plausible / custom endpoint call), forwards them. Out of the box it
   only logs in development, so nothing is sent until a real sink is
   wired in — no PII, no third-party by default.
   ============================================================ */

export type AnalyticsEvent =
  | { name: "play_start"; day: number; year: number }
  | { name: "guess"; day: number; n: number }
  | { name: "resolve"; day: number; win: boolean; guesses: number }
  | { name: "share"; day: number; channel: "native" | "clipboard" };

type Sink = (event: AnalyticsEvent) => void;

let sink: Sink | null = null;

/** Register the real destination for events (call once at startup). */
export function setAnalyticsSink(fn: Sink): void {
  sink = fn;
}

export function track(event: AnalyticsEvent): void {
  if (sink) {
    try {
      sink(event);
    } catch {
      /* never let analytics break gameplay */
    }
  } else if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[yomi:analytics]", event);
  }
}
