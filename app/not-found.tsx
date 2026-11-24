import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell py-24 sm:py-32">
      <p className="inline-flex items-center gap-2 font-mono text-sm text-ink-muted">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-warn" />
        404 · Route not found.
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">It wandered into the Labyrinth.</h1>
      <Link href="/" className="mt-8 inline-block text-sm font-medium text-accent hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
