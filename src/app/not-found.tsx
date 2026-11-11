import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="not-found section-shell">
      <span className="eyebrow">404 / A LITTLE OFF THE MENU</span>
      <h1>
        This one&apos;s not
        <br />
        <em>on the menu.</em>
      </h1>
      <p>Let&apos;s get you back to something delicious.</p>
      <Link href="/menu" className="button primary">
        Explore the menu
      </Link>
    </main>
  );
}
