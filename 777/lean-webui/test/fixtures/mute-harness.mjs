// mute-harness.mjs — answers initialize, then never answers again.
// Lets the test kill it mid-call and assert the rejection names the call.
process.stdin.setEncoding("utf8");
let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }
    if (message.id === undefined) continue; // notifications never answer
    if (message.method === "initialize") {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            protocolVersion: "2025-06-18",
            capabilities: {
              suplex: {
                contract: "mcp v1",
                semver: "1.0.0",
                tier: "free",
                framework: { name: "fixture", version: "0.0.0" },
                capabilities: [],
              },
            },
            serverInfo: { name: "mute-harness", version: "0.0.0" },
          },
        }) + "\n",
      );
    }
  }
});
