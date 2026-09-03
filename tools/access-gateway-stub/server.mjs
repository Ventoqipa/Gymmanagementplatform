#!/usr/bin/env node
/**
 * Access Gateway STUB — solo para pruebas LAN (AnyDesk + Neubox).
 *
 * Uso en el PC del gym:
 *   node tools/access-gateway-stub/server.mjs
 *
 * Sin Cloudflare — opciones HTTPS → Elite en Neubox:
 *   A) http://127.0.0.1:8787  (Chrome/Edge en el mismo PC suelen permitirlo)
 *   B) ACCESS_GATEWAY_TLS=1   (HTTPS autofirmado; ver generate-certs.bat)
 *   C) npx localtunnel --port 8787
 *
 * Contrato: docs/CONTRATO-ACCESS-GATEWAY.md
 */

import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { URL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.ACCESS_GATEWAY_PORT || 8787);
const HOST = process.env.ACCESS_GATEWAY_HOST || "0.0.0.0";
const USE_TLS = process.env.ACCESS_GATEWAY_TLS === "1";
const CERT_DIR = process.env.ACCESS_GATEWAY_CERT_DIR || path.join(__dirname, "certs");

const TERMINALS = {
  "TRN-MAIN-01": { serial: "SYZ8244300163", label: "Entrada principal" },
  "TRN-MAIN-02": { serial: "SYZ8244300350", label: "Entrada lateral" },
};

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
    .match(/^CLI-(\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function handleEnroll(req, res) {
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
  const pin = body?.pin ?? (clientId != null ? String(clientId) : undefined);
  const timeoutSeconds = Number(body?.timeoutSeconds ?? 120);

  if (!terminalId || !memberId) {
    return sendJson(res, 400, {
      ok: false,
      code: "INVALID_REQUEST",
      message: "terminalId y memberId son requeridos",
      terminalId,
    });
  }

  const terminal = TERMINALS[terminalId];
  if (!terminal) {
    return sendJson(res, 404, {
      ok: false,
      code: "TERMINAL_NOT_FOUND",
      message: `terminalId no mapeado: ${terminalId}`,
      terminalId,
    });
  }

  // Simula espera de captura (corto; en producción usa timeoutSeconds).
  const waitMs = Math.min(1500, Math.max(400, Math.floor(timeoutSeconds * 8)));
  await new Promise((r) => setTimeout(r, waitMs));

  const vendorRequestId = `stub_enroll_${Date.now().toString(36)}`;
  const templateId = `tmpl_${memberId.replace(/\W/g, "")}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  console.log(
    `[enroll] ${memberId} @ ${terminalId} (${terminal.serial}) pin=${pin} name=${displayName || "-"}`,
  );

  return sendJson(res, 200, {
    ok: true,
    templateId,
    vendorRequestId,
    qualityScore: 0.93,
    latencyMs: Date.now() - started,
    terminalId,
    deviceSerial: terminal.serial,
    pin,
    enrolledAtIso: new Date().toISOString(),
    stub: true,
    note: "STUB: no escribió en SpeedFace/ADMS. Solo valida red Elite↔Gateway.",
  });
}

const onRequest = async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "access-gateway-stub",
      terminals: TERMINALS,
    });
  }

  if (req.method === "GET" && url.pathname === "/v1/terminals") {
    return sendJson(
      res,
      200,
      Object.entries(TERMINALS).map(([id, t]) => ({
        terminalId: id,
        ...t,
        online: true,
      })),
    );
  }

  if (req.method === "POST" && url.pathname === "/v1/biometric/enroll") {
    try {
      return await handleEnroll(req, res);
    } catch (e) {
      console.error(e);
      return sendJson(res, 500, {
        ok: false,
        code: "UNKNOWN",
        message: e instanceof Error ? e.message : "Error interno",
      });
    }
  }

  sendJson(res, 404, {
    ok: false,
    code: "UNKNOWN",
    message: `No encontrado: ${req.method} ${url.pathname}`,
  });
};

function readTlsOptions() {
  const keyPath =
    process.env.ACCESS_GATEWAY_KEY || path.join(CERT_DIR, "key.pem");
  const certPath =
    process.env.ACCESS_GATEWAY_CERT || path.join(CERT_DIR, "cert.pem");
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error(
      "Faltan certificados TLS. En esta carpeta ejecuta generate-certs.bat (Windows) o generate-certs.sh",
    );
    console.error(`  Esperado: ${keyPath} y ${certPath}`);
    process.exit(1);
  }
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

const boundServer = USE_TLS
  ? https.createServer(readTlsOptions(), onRequest)
  : http.createServer(onRequest);

boundServer.listen(PORT, HOST, () => {
  const scheme = USE_TLS ? "https" : "http";
  console.log(`Access Gateway STUB escuchando ${scheme}://${HOST}:${PORT}`);
  console.log(`  GET  /health`);
  console.log(`  GET  /v1/terminals`);
  console.log(`  POST /v1/biometric/enroll`);
  if (USE_TLS) {
    console.log(`  Elite (consola): localStorage.setItem("elite_access_gateway_url", "${scheme}://127.0.0.1:${PORT}")`);
    console.log(`  Abre ${scheme}://127.0.0.1:${PORT}/health una vez y acepta el certificado.`);
  } else {
    console.log(`  Sin túnel: localStorage.setItem("elite_access_gateway_url", "http://127.0.0.1:${PORT}")`);
    console.log(`  (Chrome/Edge en este PC suelen permitir HTTPS Elite → http://127.0.0.1)`);
  }
  console.log(`  (ADMS/SpeedFace: pendiente — este stub no enrola hardware)`);
});
