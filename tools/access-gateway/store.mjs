/**
 * Estado en memoria del Access Gateway productivo.
 * Los lectores se detectan solos (cualquier SN que haga ADMS PUSH) y se guardan en terminals.json.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TERMINALS_FILE =
  process.env.TERMINALS_FILE ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), "terminals.json");

const DEFAULT_TERMINALS = {
  "TRN-MAIN-01": {
    serial: "SYZ8244300163",
    label: "Entrada principal",
  },
  "TRN-MAIN-02": {
    serial: "SYZ8244300350",
    label: "Entrada lateral",
  },
};

const MAX_LABEL_LENGTH = 40;
const VALID_SERIAL = /^[A-Za-z0-9_-]{4,40}$/;

function loadTerminals() {
  try {
    const raw = JSON.parse(fs.readFileSync(TERMINALS_FILE, "utf8"));
    if (raw && typeof raw === "object" && raw.terminals && typeof raw.terminals === "object") {
      return raw.terminals;
    }
  } catch {
    /* primer arranque o archivo dañado: usar defaults */
  }
  return structuredClone(DEFAULT_TERMINALS);
}

export const TERMINALS = loadTerminals();

function saveTerminals() {
  try {
    const tmp = `${TERMINALS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ terminals: TERMINALS }, null, 2), "utf8");
    fs.renameSync(tmp, TERMINALS_FILE);
  } catch (e) {
    console.error(`[terminals] no se pudo guardar ${TERMINALS_FILE}:`, e?.message || e);
  }
}

/** Registra un lector nuevo la primera vez que hace contacto ADMS. */
export function ensureTerminalForSerial(sn) {
  const serial = String(sn || "").trim();
  if (!VALID_SERIAL.test(serial)) return null;
  const existing = terminalIdFromSerial(serial);
  if (existing) return existing;

  const terminalId = `TRN-${serial.toUpperCase()}`;
  const count = Object.keys(TERMINALS).length + 1;
  TERMINALS[terminalId] = {
    serial,
    label: `Lector ${count}`,
    autoDetected: true,
    firstSeenIso: new Date().toISOString(),
  };
  saveTerminals();
  pushActivity(`${serial}: NUEVO LECTOR detectado (${terminalId})`, {
    serial,
    kind: "detected",
  });
  return terminalId;
}

export function renameTerminal(terminalId, label) {
  const t = TERMINALS[terminalId];
  if (!t) return { ok: false, code: "TERMINAL_NOT_FOUND" };
  const clean = String(label || "")
    .replace(/[\t\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LABEL_LENGTH);
  if (!clean) return { ok: false, code: "INVALID_LABEL" };
  t.label = clean;
  saveTerminals();
  return { ok: true, terminalId, label: clean };
}

/** Solo lectores desconectados (p. ej. un equipo reemplazado). Si vuelve a reportar, se detecta otra vez. */
export function removeTerminal(terminalId) {
  const t = TERMINALS[terminalId];
  if (!t) return { ok: false, code: "TERMINAL_NOT_FOUND" };
  if (isDeviceOnline(t.serial)) return { ok: false, code: "TERMINAL_ONLINE" };
  delete TERMINALS[terminalId];
  devices.delete(t.serial);
  saveTerminals();
  return { ok: true, terminalId };
}

export function terminalIdFromSerial(sn) {
  const serial = String(sn || "").trim().toUpperCase();
  for (const [id, t] of Object.entries(TERMINALS)) {
    if (t.serial.toUpperCase() === serial) return id;
  }
  return null;
}

export function serialFromTerminalId(terminalId) {
  return TERMINALS[terminalId]?.serial ?? null;
}

/** @type {Map<string, { serial: string, lastSeenIso: string, info: Record<string,string>, online: boolean }>} */
export const devices = new Map();

/** @type {Map<string, string[]>} serial -> command lines "C:id:CMD" */
export const commandQueues = new Map();

let nextCmdId = 1;

export function queueCommand(serial, body) {
  const sn = String(serial).trim();
  const id = nextCmdId++;
  const line = `C:${id}:${body}`;
  if (!commandQueues.has(sn)) commandQueues.set(sn, []);
  commandQueues.get(sn).push(line);
  console.log(`[adms:cmd] queue SN=${sn} ${line}`);
  return id;
}

export function drainCommands(serial, max = 8) {
  const sn = String(serial).trim();
  const q = commandQueues.get(sn) || [];
  if (q.length === 0) return "";
  const take = q.splice(0, max);
  return take.join("\n") + (take.length ? "\n" : "");
}

/** @type {Array<object>} */
export const events = [];
const MAX_EVENTS = 200;
/** @type {Set<import('node:http').ServerResponse>} */
export const sseClients = new Set();

export function pushEvent(evt) {
  events.unshift(evt);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  const payload = `event: access\ndata: ${JSON.stringify(evt)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
  return evt;
}

/** Enrolamientos en espera: pin -> { resolve, reject, timer, ... } */
export const pendingEnrolls = new Map();

/** Esperas de verify (long-poll): terminalId -> [{ resolve, timer }] */
export const pendingVerifies = new Map();

export function touchDevice(serial, info = {}) {
  const sn = String(serial).trim();
  if (!ensureTerminalForSerial(sn)) return;
  const prev = devices.get(sn) || { serial: sn, info: {}, online: false };
  devices.set(sn, {
    serial: sn,
    lastSeenIso: new Date().toISOString(),
    info: { ...prev.info, ...info },
    online: true,
  });
}

export function isDeviceOnline(serial, thresholdMs = 120_000) {
  const d = devices.get(String(serial).trim());
  if (!d?.lastSeenIso) return false;
  return Date.now() - Date.parse(d.lastSeenIso) < thresholdMs;
}

/** Bitácora ADMS (como “Actividad” de un panel de dispositivos). */
export const activityLog = [];
const MAX_ACTIVITY = 120;
export const startedAtIso = new Date().toISOString();

export function pushActivity(message, meta = {}) {
  const row = {
    id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    atIso: new Date().toISOString(),
    message: String(message),
    ...meta,
  };
  activityLog.unshift(row);
  if (activityLog.length > MAX_ACTIVITY) activityLog.length = MAX_ACTIVITY;
  console.log(`[activity] ${row.message}`);
  return row;
}
