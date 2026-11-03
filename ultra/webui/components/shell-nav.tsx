"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandBar } from "@/components/command-bar";
import type { CommandDef } from "@/lib/shell/commands";
import {
  SURFACES,
  gateReason,
  isSurfaceAvailable,
  type Surface,
  type Tier,
} from "@/lib/shell/surfaces";

function LockGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function NavRow({ surface, tier, active }: { surface: Surface; tier: Tier; active: boolean }) {
  const available = isSurfaceAvailable(surface, tier);
  const reason = gateReason(surface, tier);

  // Gold 2px rail: bottom edge on the mobile strip, left edge on the desktop rail.
  const rail = active ? "border-gold" : "border-transparent";
  const text = active ? "text-ink" : available ? "text-ink-2 hover:text-ink" : "text-muted";

  const inner = (
    <>
      <span className={`truncate text-sm font-medium ${text}`}>{surface.label}</span>
      {!available && (
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted">
          <LockGlyph />
          {surface.locked ? "locked" : "ultra"}
        </span>
      )}
    </>
  );

  const cls = `flex items-center gap-2.5 whitespace-nowrap border-b-2 px-4 py-2.5 md:border-b-0 md:border-l-2 ${rail}`;

  if (available) {
    return (
      <Link href={surface.route} aria-current={active ? "page" : undefined} title={reason ?? surface.description} className={cls}>
        {inner}
      </Link>
    );
  }

  // Gated or locked: a non-link row with a named gate, never a fake preview.
  return (
    <span aria-disabled="true" title={reason ?? surface.description} className={`cursor-not-allowed ${cls}`}>
      {inner}
    </span>
  );
}

export function ShellNav({
  tier,
  commands,
  children,
}: {
  tier: Tier;
  commands: CommandDef[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = (route: string) => (route === "/" ? pathname === "/" : pathname.startsWith(route));

  return (
    <div className="flex h-screen flex-col">
      {/* ── navy chrome band ─────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-3 bg-navy px-4 sm:px-5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-white/15">
          {/* the shipped mark — a file, never redrawn */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="AI-Suplex Labs" width="22" height="22" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-navy-ink">
          AI-Suplex <span className="font-medium text-gold-bright">Ultra</span>
        </span>
        <span className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-widest text-navy-muted">
          {tier}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <CommandBar tier={tier} commands={commands} />
          <ThemeToggle />
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ── nav: horizontal strip on mobile, vertical rail on desktop ─── */}
        <nav
          aria-label="Surfaces"
          className="flex shrink-0 overflow-x-auto border-b border-border md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:py-2"
        >
          {SURFACES.map((s) => (
            <NavRow key={s.key} surface={s} tier={tier} active={active(s.route)} />
          ))}
        </nav>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
