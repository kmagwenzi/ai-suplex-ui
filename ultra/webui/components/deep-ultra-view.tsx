"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/panel";

type State =
  | { status: "loading" }
  | { status: "error"; command: string; message: string }
  | { status: "ok"; text: string };

export function DeepUltraView() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/surface/deep-ultra");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (active) {
            setState({
              status: "error",
              command: body?.command ?? "node Tools/deep-ultra.js latest --dry",
              message: body?.message ?? body?.error ?? `HTTP ${res.status}`,
            });
          }
          return;
        }
        const text = await res.text();
        if (active) setState({ status: "ok", text });
      } catch (err) {
        if (active) {
          setState({ status: "error", command: "node Tools/deep-ultra.js latest --dry", message: String(err) });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="px-5 py-5 text-sm text-muted sm:px-8">Loading Deep Ultra…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="p-6">
        <Panel tone="error" title="Deep Ultra — tool failed">
          <code className="font-mono text-[13px]">{state.command}</code> — {state.message}.
        </Panel>
      </div>
    );
  }

  // The tool is the surface: render its ANSI-stripped text verbatim.
  return (
    <pre className="whitespace-pre-wrap break-words px-5 py-5 font-mono text-[13px] leading-relaxed sm:px-8">
      {state.text}
    </pre>
  );
}
