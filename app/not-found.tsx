import Link from "next/link";

export default function NotFound() {
  return (
    <div className="ym-root">
      <div className="ym-sky" />
      <div className="ym-glow" />
      <div className="ym-haze" />
      <div
        className="ym-wrap"
        style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center" }}
      >
        <div>
          <div style={{ fontWeight: 700, letterSpacing: "0.16em", fontSize: 21 }}>YOMI</div>
          <div style={{ marginTop: 14, fontSize: 40, fontWeight: 700 }}>404</div>
          <p style={{ marginTop: 8, color: "var(--ink-soft)" }}>
            This page wandered off. Today&apos;s word is still waiting.
          </p>
          <Link href="/" className="ym-share" style={{ marginTop: 22, display: "inline-flex", width: "auto", padding: "13px 22px", textDecoration: "none" }}>
            Play YOMI →
          </Link>
        </div>
      </div>
    </div>
  );
}
