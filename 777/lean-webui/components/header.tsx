"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface Health {
  ok: boolean;
  contract: string | null;
  tier: string | null;
  ms?: number;
  error?: string;
}

/** A drawn mark — the pipeline itself, one filled node on the line. */
function Mark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden
      className="text-accent"
    >
      <rect
        x="0.5"
        y="0.5"
        width="21"
        height="21"
        rx="6"
        fill="none"
        stroke="currentColor"
      />
      <circle cx="6.5" cy="11" r="1.6" fill="currentColor" />
      <circle cx="11" cy="11" r="2.2" fill="currentColor" />
      <circle cx="15.5" cy="11" r="1.6" fill="currentColor" />
      <line x1="6.5" y1="11" x2="15.5" y2="11" stroke="currentColor" />
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
  ];

  return (
    <header className="flex items-center justify-between border-b border-border py-4">
      <div className="flex items-center gap-3">
        <Mark />
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            AI-Suplex 777
          </div>
          <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
            Workflow Console
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-1">
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
