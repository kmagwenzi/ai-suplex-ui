# ultra/webui — the Ultra web surface (stub)

**Paid surface. Not built.** This folder exists to mark the boundary, not to start work.

Ultra capabilities — graph · insight · projection · shell · fleet — must extend the
contract (`mcp v2` / a capability flag). They **never** leak into `mcp v1`, and nothing
under `777/` may import from here.

When this surface is built, it consumes the same seam over Streamable HTTP on `127.0.0.1`,
behind a bearer token — never a public port.
