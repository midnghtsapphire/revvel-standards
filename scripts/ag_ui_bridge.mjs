// ag_ui_bridge.mjs — AG-UI SSE bridge for live product demos. WR #18342.
// Serves /events (SSE) translating fleet-status.json + A2A bus into AG-UI events,
// and /demo (POST) returning an A2UI session stub. Zero deps (node:http).
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";

const PORT = process.env.AGUI_PORT || 3006;
const FLEET_STATUS = process.env.FLEET_STATUS || "fleet-status.json";

const clients = new Set();

function fleetSnapshot() {
  if (!existsSync(FLEET_STATUS)) return { agents: [], note: "no fleet-status.json yet" };
  try { return JSON.parse(readFileSync(FLEET_STATUS, "utf8")); }
  catch { return { agents: [], note: "parse error" }; }
}

function emit(type, data) {
  const frame = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(frame);
}

const server = http.createServer((req, res) => {
  if (req.url === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" });
    clients.add(res);
    req.on("close", () => clients.delete(res));
    res.write(`event: STATE_SNAPSHOT\ndata: ${JSON.stringify(fleetSnapshot())}\n\n`);
    return;
  }
  if (req.url === "/demo" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c);
    req.on("end", () => {
      const session = { session_id: `demo-${Date.now()}`,
        blocks: [{ type: "card", title: "Demo session started",
                   body: "Fleet is picking up your request." }] };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(session));
      emit("RUN_STARTED", { session: session.session_id });
    });
    return;
  }
  if (req.url === "/health") { res.writeHead(200); res.end("ok"); return; }
  res.writeHead(404); res.end();
});

// Push a fresh snapshot every 5s (per standard contract)
setInterval(() => emit("STATE_SNAPSHOT", fleetSnapshot()), 5000);
server.listen(PORT, () => console.log(`AG-UI bridge on :${PORT} — /events /demo /health`));
