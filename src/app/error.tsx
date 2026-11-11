"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="not-found section-shell">
      <span className="eyebrow">A SMALL INTERRUPTION</span>
      <h1>
        Let&apos;s try
        <br />
        <em>that again.</em>
      </h1>
      <p>
        We couldn&apos;t load this page. Your saved bag is still in this browser.
      </p>
      <button onClick={reset} className="button primary">
        Try again
      </button>
    </main>
  );
}
