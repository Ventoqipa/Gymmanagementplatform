#!/usr/bin/env node
/**
 * Access Gateway PRODUCTIVO — Elite Gym
 *
 * Dos puertos:
 *   ADMS_PORT (default 8096)  → SpeedFace ADMS PUSH (/iclock/*)
 *   ELITE_PORT (default 8787) → API Elite (/v1/*, /health)
 *
 * Sin simulación. Solo eventos reales del dispositivo.
 *
 * Uso en PC del gym:
 *   node server.mjs
 *
 * Requisitos:
 *   1) Puerto ADMS libre (solo este Gateway).
 *   2) En cada SpeedFace: Cloud Server / ADMS = IP_DEL_PC:8096
 *   3) Elite (consola): localStorage.setItem("elite_access_gateway_url","http://127.0.0.1:8787")
 */

import http from "node:http";
import { URL } from "node:url";
import {
  enrollOnDevice,
  handleAdms,
  listTerminalStatus,
  waitForAccessEvent,
} from "./adms.mjs";
import {
  events,
  isDeviceOnline,
  serialFromTerminalId,
  sseClients,
  TERMINALS,
  devices,
  activityLog,
  pushActivity,
  startedAtIso,
  pendingEnrolls,
} from "./store.mjs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";

const execAsync = promisify(exec);

const ADMS_PORT = Number(process.env.ADMS_PORT || 8096);
const ELITE_PORT = Number(process.env.ELITE_PORT || 8787);
const HOST = process.env.ACCESS_GATEWAY_HOST || "0.0.0.0";

function listLanIps() {
  try {
    const ifaces = os.networkInterfaces();
    const lanIps = [];
    for (const [name, list] of Object.entries(ifaces || {})) {
      for (const addr of list || []) {
        if (addr.family === "IPv4" && !addr.internal) {
          lanIps.push({ name, address: addr.address });
        }
      }
    }
    return lanIps;
  } catch {
    return [];
  }
}

async function runPortCheck() {
  try {
    const cmd =
      process.platform === "win32"
        ? `netstat -ano | findstr ":${ADMS_PORT} :${ELITE_PORT}"`
        : `netstat -an | grep -E ':${ADMS_PORT}|:${ELITE_PORT}' || true`;
    const { stdout } = await execAsync(cmd, {
      timeout: 5000,
      windowsHide: true,
    });
    return {
      netstat: String(stdout || "").trim().slice(0, 4000),
      netstatError: null,
    };
  } catch (e) {
    return {
      netstat: null,
      netstatError: e instanceof Error ? e.message : String(e),
    };
  }
}

async function buildDiagnostics({ includeNetstat = false, source = "poll" } = {}) {
  const terminals = listTerminalStatus();
  const lanIps = listLanIps();
  let netstat = null;
  let netstatError = null;
  if (includeNetstat) {
    const check = await runPortCheck();
    netstat = check.netstat;
    netstatError = check.netstatError;
    pushActivity(
      source === "button"
        ? "DIAGNOSTICO: check-ports (botón Elite)"
        : "DIAGNOSTICO: netstat ejecutado desde Elite",
      { kind: "diagnostics" },
    );
  }
  return {
    ok: true,
    atIso: new Date().toISOString(),
    startedAtIso,
    hostname: os.hostname(),
    platform: process.platform,
    admsPort: ADMS_PORT,
    elitePort: ELITE_PORT,
    lanIps,
    suggestedAdmsUrl: lanIps[0]
      ? `http://${lanIps[0].address}:${ADMS_PORT}`
      : `http://127.0.0.1:${ADMS_PORT}`,
    suggestedEliteUrl: `http://127.0.0.1:${ELITE_PORT}`,
    terminals,
    devicesOnline: terminals.filter((t) => t.online).length,
    eventsCount: events.length,
    pendingEnrolls: pendingEnrolls.size,
    activityRecent: activityLog.slice(0, 20),
    netstat,
    netstatError,
      setupHints: [
        "SpeedFace Cloud Server = IP LAN de este PC",
        `Puerto ADMS = ${ADMS_PORT}`,
        `Elite → Panel → Reconectar (http://127.0.0.1:${ELITE_PORT})`,
        "Arranque: install-autostart.bat una vez (o start-gateway.bat en pruebas)",
        "Diagnóstico de puertos: botón en Elite (Panel)",
      ],
  };
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, X-Request-Id",
  );
}

function sendJson(res, status, body) {
  cors(res);
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(raw),
  });
  res.end(raw);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve(null);
      try {
        resolve(JSON.parse(text));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function clientIdFromMemberId(memberId) {
  const m = String(memberId || "")
    .trim()
    .match(/^CLI[_-]?(\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function handleEliteEnroll(req, res) {
  const started = Date.now();
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, {
      ok: false,
      code: "INVALID_REQUEST",
      message: "JSON inválido",
    });
  }

  const terminalId = body?.terminalId;
  const memberId = String(body?.memberId || "").trim();
  const displayName = body?.displayName?.trim();
  const clientId =
    body?.clientId ?? clientIdFromMemberId(memberId) ?? undefined;
  const pin = String(body?.pin ?? (clientId != null ? clientId : "")).trim();
  const timeoutSeconds = Number(body?.timeoutSeconds ?? 120);

  if (!terminalId || !memberId || !pin) {
    return sendJson(res, 400, {
      ok: false,
      code: "INVALID_REQUEST",
      message: "terminalId, memberId y pin/clientId son requeridos",
      terminalId,
    });
  }

  const serial = serialFromTerminalId(terminalId);
  if (!serial) {
    return sendJson(res, 404, {
      ok: false,
      code: "TERMINAL_NOT_FOUND",
      message: `terminalId no mapeado: ${terminalId}`,
      terminalId,
    });
  }

  if (!isDeviceOnline(serial)) {
    return sendJson(res, 502, {
      ok: false,
      code: "DEVICE_OFFLINE",
      message: `SpeedFace ${serial} no está ONLINE vía ADMS. Verifique Cloud Server = este PC:${ADMS_PORT}`,
      terminalId,
    });
  }

  try {
    const result = await enrollOnDevice({
      serial,
      pin,
      displayName: displayName || memberId,
      timeoutSeconds,
    });
    return sendJson(res, 200, {
      ok: true,
      templateId: result.templateId,
      vendorRequestId: `enroll_${Date.now().toString(36)}`,
      qualityScore: result.qualityScore ?? 0.92,
      latencyMs: Date.now() - started,
      terminalId,
      deviceSerial: serial,
      pin,
      enrolledAtIso: new Date().toISOString(),
    });
  } catch (e) {
    const code = e?.code || "UNKNOWN";
    const status =
      code === "DEVICE_OFFLINE"
        ? 502
        : code === "CAPTURE_TIMEOUT"
          ? 408
          : 500;
    return sendJson(res, status, {
      ok: false,
      code,
      message: e instanceof Error ? e.message : "Enrolamiento falló",
      terminalId,
    });
  }
}

async function handleEliteVerify(req, res) {
  const started = Date.now();
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, {
      ok: false,
      code: "INVALID_REQUEST",
      message: "JSON inválido",
    });
  }

  const terminalId = body?.terminalId || "TRN-MAIN-01";
  const timeoutSeconds = Number(body?.timeoutSeconds ?? 45);
  const serial = serialFromTerminalId(terminalId);

  if (!serial) {
    return sendJson(res, 404, {
      ok: false,
      code: "TERMINAL_NOT_FOUND",
      message: `terminalId no mapeado: ${terminalId}`,
    });
  }
  if (!isDeviceOnline(serial)) {
    return sendJson(res, 502, {
      ok: false,
      code: "DEVICE_OFFLINE",
      message: `SpeedFace ${serial} offline`,
      terminalId,
    });
  }

  try {
    const evt = await waitForAccessEvent(terminalId, timeoutSeconds);
    const match = evt.result === "GRANTED";
    return sendJson(res, 200, {
      match,
      confidence: evt.confidence ?? (match ? 0.95 : 0.4),
      memberId: evt.memberId,
      memberName: evt.memberName,
      membershipTier: evt.tier,
      denyReason: match ? undefined : evt.reason || "NO_MATCH",
      vendorRequestId: evt.faceIdVendorRequestId,
      latencyMs: Date.now() - started,
      captureSnapshotUrl: evt.captureSnapshotUrl,
    });
  } catch (e) {
    const code = e?.code || "UNKNOWN";
    return sendJson(res, code === "CAPTURE_TIMEOUT" ? 408 : 500, {
      ok: false,
      code,
      message: e instanceof Error ? e.message : "Verify falló",
      terminalId,
    });
  }
}

async function handleEliteTurnstile(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, {
      ok: false,
      code: "INVALID_REQUEST",
      message: "JSON inválido",
    });
  }
  // Wiegand lo maneja el SpeedFace localmente. Registramos el comando.
  const terminalId = body?.terminalId;
  const command = body?.command;
  console.log(`[turnstile] ${command} @ ${terminalId} (Wiegand local en dispositivo)`);
  return sendJson(res, 200, {
    accepted: true,
    vendorCommandId: `local_${command}_${Date.now().toString(36)}`,
    appliedAtIso: new Date().toISOString(),
    note: "Apertura física la decide el SpeedFace vía Wiegand tras match.",
  });
}

const eliteServer = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/health") {
    const terminals = listTerminalStatus();
    return sendJson(res, 200, {
      ok: true,
      service: "access-gateway",
      mode: "production",
      simulateAccess: false,
      admsPort: ADMS_PORT,
      elitePort: ELITE_PORT,
      terminals,
      devicesOnline: terminals.filter((t) => t.online).length,
      eventsCount: events.length,
      activityCount: activityLog.length,
      startedAtIso,
      note: "ADMS real. SpeedFace Cloud Server → este PC.",
    });
  }

  if (req.method === "GET" && url.pathname === "/v1/terminals") {
    return sendJson(res, 200, listTerminalStatus());
  }

  if (req.method === "GET" && url.pathname === "/v1/activity") {
    const limit = Math.min(80, Number(url.searchParams.get("limit") || 40));
    return sendJson(res, 200, {
      ok: true,
      activity: activityLog.slice(0, limit),
    });
  }

  if (req.method === "GET" && url.pathname === "/v1/diagnostics") {
    const runNetstat = url.searchParams.get("netstat") === "1";
    try {
      return sendJson(
        res,
        200,
        await buildDiagnostics({ includeNetstat: runNetstat, source: "poll" }),
      );
    } catch (e) {
      return sendJson(res, 500, {
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/v1/diagnostics/run") {
    try {
      return sendJson(
        res,
        200,
        await buildDiagnostics({ includeNetstat: true, source: "button" }),
      );
    } catch (e) {
      return sendJson(res, 500, {
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/v1/reconnect") {
    const terminals = listTerminalStatus();
    const onlineCount = terminals.filter((t) => t.online).length;
    const lanIps = listLanIps();
    pushActivity("RECONEXION: Elite ↔ Gateway / ADMS", { kind: "reconnect" });
    return sendJson(res, 200, {
      ok: true,
      eliteConnected: true,
      admsListening: true,
      atIso: new Date().toISOString(),
      admsPort: ADMS_PORT,
      elitePort: ELITE_PORT,
      terminals,
      devicesOnline: onlineCount,
      suggestedAdmsUrl: lanIps[0]
        ? `http://${lanIps[0].address}:${ADMS_PORT}`
        : `http://127.0.0.1:${ADMS_PORT}`,
      suggestedEliteUrl: `http://127.0.0.1:${ELITE_PORT}`,
      message:
        onlineCount > 0
          ? `Elite conectado. ${onlineCount} lector(es) ADMS online.`
          : `Elite conectado al Gateway. ADMS escuchando en :${ADMS_PORT}. Espere el próximo ping del SpeedFace (Cloud Server = IP de este PC).`,
    });
  }

  if (req.method === "GET" && url.pathname === "/v1/events") {
    const since = url.searchParams.get("since");
    let list = events;
    if (since) {
      const t = Date.parse(since);
      if (!Number.isNaN(t)) {
        list = events.filter((e) => Date.parse(e.timestampIso) > t);
      }
    }
    const limit = Math.min(50, Number(url.searchParams.get("limit") || 30));
    return sendJson(res, 200, { ok: true, events: list.slice(0, limit) });
  }

  if (req.method === "GET" && url.pathname === "/v1/events/stream") {
    cors(res);
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(
      `event: hello\ndata: ${JSON.stringify({ ok: true, mode: "production" })}\n\n`,
    );
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/biometric/enroll") {
    return handleEliteEnroll(req, res);
  }
  if (req.method === "POST" && url.pathname === "/v1/biometric/verify") {
    return handleEliteVerify(req, res);
  }
  if (req.method === "POST" && url.pathname === "/v1/turnstile/command") {
    return handleEliteTurnstile(req, res);
  }

  sendJson(res, 404, {
    ok: false,
    code: "UNKNOWN",
    message: `No encontrado: ${req.method} ${url.pathname}`,
  });
});

const admsServer = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/iclock")) {
    res.writeHead(404);
    return res.end("ADMS only");
  }
  try {
    await handleAdms(req, res, url);
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end("ERROR");
  }
});

eliteServer.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `\nERROR: Puerto Elite ${ELITE_PORT} en uso. Cierra el otro proceso o usa ELITE_PORT=8788\n`,
    );
    process.exit(1);
  }
  throw err;
});

admsServer.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`
═══════════════════════════════════════════════════════════
  ERROR: Puerto ADMS ${ADMS_PORT} ocupado.

  1) Cierra el otro programa que use el puerto ${ADMS_PORT}
  2) netstat -ano | findstr ":${ADMS_PORT}"
  3) Vuelve a ejecutar start-gateway.bat
═══════════════════════════════════════════════════════════
`);
    process.exit(1);
  }
  throw err;
});

eliteServer.listen(ELITE_PORT, HOST, () => {
  console.log(`Elite API  http://${HOST}:${ELITE_PORT}`);
  console.log(`  GET  /health`);
  console.log(`  GET  /v1/terminals`);
  console.log(`  GET  /v1/activity`);
  console.log(`  GET  /v1/diagnostics`);
  console.log(`  POST /v1/diagnostics/run`);
  console.log(`  POST /v1/reconnect`);
  console.log(`  GET  /v1/events`);
  console.log(`  POST /v1/biometric/enroll`);
  console.log(`  POST /v1/biometric/verify  (espera ATTLOG real)`);
});

admsServer.listen(ADMS_PORT, HOST, () => {
  console.log(`ADMS PUSH  http://${HOST}:${ADMS_PORT}/iclock/...`);
  console.log(`  Terminales:`);
  for (const [id, t] of Object.entries(TERMINALS)) {
    console.log(`    ${id} → SN ${t.serial}`);
  }
  console.log(``);
  console.log(`MODO: ADMS directo + Elite`);
  console.log(`  1. Puerto ${ADMS_PORT} libre para este Gateway`);
  console.log(`  2. SpeedFace Cloud Server = IP_de_este_PC:${ADMS_PORT}`);
  console.log(`  3. Elite: localStorage elite_access_gateway_url = http://127.0.0.1:${ELITE_PORT}`);
  console.log(`  4. Health: http://127.0.0.1:${ELITE_PORT}/health`);
  console.log(`  5. Manual: docs/MANUAL-ADMIN-ACCESO.md`);
});

// Marcar offline si no hay heartbeat
setInterval(() => {
  for (const [sn, d] of devices) {
    if (!isDeviceOnline(sn)) {
      if (d.online) {
        d.online = false;
        console.log(`[adms] OFFLINE SN=${sn}`);
      }
    }
  }
}, 30_000);
