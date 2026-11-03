"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/panel";

type FrameState = "loading" | "loaded" | "timeout" | "error";

/**
 * Embed a surface over the passthrough route. The iframe loads the raw bytes;
 * the frame only adds a loading state, an 8 s budget and a named failure
 * panel. It never parses, re-renders or restyles the artifact.
 */
export function ArtifactFrame({
  surface,
  title,
  artifactPath,
}: {
  surface: string;
  title: string;
  artifactPath?: string;
}) {
  const [state, setState] = useState<FrameState>("loading");

  useEffect(() => {
    const budget = setTimeout(() => {
      setState((s) => (s === "loading" ? "timeout" : s));
    }, 8000);
    return () => clearTimeout(budget);
  }, []);

  if (state === "timeout") {
    return (
      <Panel tone="error" title={`${title} — load timed out`}>
        <p>
          The surface did not load within 8 s. Route{" "}
          <code className="font-mono text-[13px]">/artifacts/{surface}</code>
          {artifactPath ? (
            <>
              {" "}
              · artifact <code className="font-mono text-[13px]">{artifactPath}</code>
            </>
          ) : null}
          .
        </p>
      </Panel>
    );
  }

  if (state === "error") {
    return (
      <Panel tone="error" title={`${title} — failed to load`}>
        <p>
          The surface could not be reached over{" "}
          <code className="font-mono text-[13px]">/artifacts/{surface}</code>
          {artifactPath ? (
            <>
              {" "}
              · artifact <code className="font-mono text-[13px]">{artifactPath}</code>
            </>
          ) : null}
          .
        </p>
      </Panel>
    );
  }

  return (
    <div className="relative h-full w-full">
      {state === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg">
          <span className="text-sm text-muted">Loading {title}…</span>
        </div>
      )}
      <iframe
        src={`/artifacts/${surface}`}
        title={title}
        className={`h-full w-full border-0 ${state === "loaded" ? "visible" : "invisible"}`}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
      />
    </div>
  );
}
