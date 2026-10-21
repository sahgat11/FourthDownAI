import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex max-w-[62ch] flex-col items-start gap-4 py-8">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Page not found</h1>
      <p className="text-ink-2">
        That address doesn&apos;t match a page here. Projections, breakouts and waiver targets are
        all linked from the top of every page.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-accent-ink hover:bg-accent-hover"
      >
        Go to the overview
      </Link>
    </div>
  );
}
