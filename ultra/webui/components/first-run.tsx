"use client";

import { CopyPathButton } from "@/components/copy-path";
import { firstRunFor, type FirstRunKey } from "@/lib/shell/first-run";

/**
 * The first-run panel — what a surface says when there is nothing behind it yet.
 *
 * It replaces the empty table, not the page: a stranger should still see the surface's
 * name and shape, and then the three commands that give it something true to say. The
 * copy is the contract (`lib/shell/first-run.ts`); this file only draws it.
 */
export function FirstRun({ surface }: { surface: FirstRunKey }) {
  const spec = firstRunFor(surface);
  if (!spec) return null;

  return (
    <section className="px-6 py-10 sm:px-9 sm:py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Day one</p>

      <h1 className="mt-3 max-w-[34ch] text-[24px] font-semibold leading-tight text-ink sm:text-[28px]">
        {spec.title}
      </h1>

      <p className="mt-3 max-w-[64ch] text-[13.5px] leading-7 text-ink-2">{spec.line}</p>

      <ol className="mt-8 max-w-[56rem] border-t border-border">
        {spec.steps.map((step, i) => (
          <li key={step.command} className="border-b border-border py-4 sm:flex sm:items-start sm:gap-5">
            <span className="mb-1 block w-7 shrink-0 font-mono text-[11px] leading-6 text-muted sm:mb-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <code className="break-all font-mono text-[13px] leading-6 text-ink">{step.command}</code>
                <CopyPathButton path={step.command} label="copy" />
              </div>
              <p className="mt-1 max-w-[62ch] text-[12.5px] leading-6 text-muted">{step.why}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-5 max-w-[62ch] text-[12.5px] leading-6 text-muted">
        Then reload. Every number this surface renders is a read of what those commands wrote — nothing is
        seeded, sampled or invented.
      </p>
    </section>
  );
}
