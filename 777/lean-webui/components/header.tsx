"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

interface Health {
  ok: boolean;
  contract: string | null;
  tier: string | null;
  ms?: number;
  error?: string;
}

/** The AI-Suplex Labs mark — navy tile, gold chevron (theme-independent). */
function Logo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 32 32"
      role="img"
      aria-label="AI-Suplex Labs"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="7" fill="#1a2947" />
      <path
        d="M8.6 21.8 L16 9.6 L23.4 21.8"
        fill="none"
        stroke="#b8862e"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/health");
        const h = (await r.json()) as Health;
        if (active) setHealth(h);
      } catch {
        if (active) setHealth({ ok: false, contract: null, tier: null, error: "unreachable" });
      }
    };
    tick();
    const iv = setInterval(tick, 5000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, []);

  const nav = [
    { href: "/", label: "Today" },
    { href: "/pipeline", label: "Pipeline" },
    { href: "/workspaces", label: "Workspaces" },
    { href: "/commands", label: "Commands" },
    { href: "/session", label: "Session" },
    { href: "/memory", label: "Memory" },
    { href: "/setup", label: "Setup" },
  ];

  return (
    <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-border py-4">
      <div className="flex items-center gap-3">
        <Logo />
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            AI-Suplex 777
          </div>
          <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
            Workflow Console
          </div>
        </div>
      </div>

      <nav className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-none sm:w-auto">
        {nav.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={
                "rounded-md px-2.5 py-1.5 text-[13px] " +
                (active
                  ? "font-semibold text-ink"
                  : "text-ink-2 hover:text-ink")
              }
            >
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <span className="mono hidden text-[11px] uppercase tracking-[0.04em] text-muted sm:inline">
          runtime: vault-native
        </span>
        <span
          className="flex items-center gap-1.5 text-[12px] text-ink-2"
          title={health?.error}
        >
          <span className={"dot " + (health && !health.ok ? "dot-err" : "dot-ok")} />
          <span className="num">
            {health?.ok ? `${health.ms ?? "…"}ms` : "down"}
          </span>
        </span>
      </div>
    </header>
  );
}
