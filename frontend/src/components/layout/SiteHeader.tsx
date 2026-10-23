"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

export const NAV = [
  { href: "/", label: "Overview" },
  { href: "/projections", label: "Projections" },
  { href: "/breakouts", label: "Breakouts" },
  { href: "/waivers", label: "Waivers" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="bg-header [--focus:var(--header-ink)]">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-8 px-4 sm:px-8">
        <Link href="/" className="flex h-14 items-center rounded-sm" aria-label="FourthDown home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-t border-header-rule px-4 sm:order-none sm:mx-0 sm:w-auto sm:border-0 sm:px-0">
          <ul className="flex h-11 items-stretch justify-between gap-2 xs:justify-start xs:gap-5 sm:h-14 sm:gap-6">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href} className="flex">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center border-b-[3px] pt-[3px] font-display text-[1.05rem] font-bold tracking-wide whitespace-nowrap uppercase transition-colors",
                      active
                        ? "border-accent text-header-ink"
                        : "border-transparent text-header-ink-2 hover:text-header-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </div>
      <div aria-hidden className="varsity-stripe" />
    </header>
  );
}
