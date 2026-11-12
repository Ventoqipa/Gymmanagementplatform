/**
 * Protocolo ADMS PUSH (ZKTeco) — productivo.
 * Endpoints: /iclock/cdata, /iclock/getrequest, /iclock/devicecmd, /iclock/registry
 */

import { createHash } from "node:crypto";
import { saveRawDump, savePhoto } from "./captures.mjs";
import {
  drainCommands,
  devices,
  events,
  isDeviceOnline,
  pendingEnrolls,
  pendingVerifies,
  pushActivity,
  pushAdmsTrace,
  pushEvent,
  queueCommand,
  serialFromTerminalId,
  terminalIdFromSerial,
  touchDevice,
  TERMINALS,
} from "./store.mjs";

const lastPingLogAt = new Map();

function shouldLogPing(sn) {
  const now = Date.now();
  const prev = lastPingLogAt.get(sn) || 0;
  if (now - prev < 15_000) return false;
  lastPingLogAt.set(sn, now);
  return true;
}

function stampNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "");
}

function parseKvLines(text) {
  const out = {};
  for (const raw of String(text || "").split(/[\r\n,]+/)) {
    const line = raw.trim();
    if (!line || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function parseTabFields(line) {
  const out = {};
  for (const part of String(line).split("\t")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** Igual que parseTabFields pero con llaves en minúsculas y separadores \t, \n, \0. */
function parseLooseFields(text) {
  const out = {};
  for (const part of String(text || "").split(/[\t\r\n\0]+/)) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const key = part.slice(0, i).trim().replace(/^\S+\s+/, "").toLowerCase();
    if (key && !(key in out)) out[key] = part.slice(i + 1).trim();
  }
  return out;
}

/** Algunos firmwares mandan PIN=20261028123045-7.jpg (fecha-PIN). */
function pinFromPhotoName(value) {
  const s = String(value || "").trim();
  const m = /^\d{14}-(\d+)(?:\.jpe?g)?$/i.exec(s);
  if (m) return m[1];
  return /^\d+$/.test(s) ? s : "";
}

const RECENT_MATCH_MS = 120_000;
const MAX_LOG_AGE_MS = 12 * 60 * 60 * 1000;

export function registryCodeFor(sn) {
  return createHash("sha1").update(`elite-gym:${sn}`).digest("hex").slice(0, 10).toUpperCase();
}

/** Formato de hora ZKTeco (segundos codificados desde 2000, hora local del PC). */
function encodeZkTime(date = new Date()) {
  return (
    ((date.getFullYear() - 2000) * 12 * 31 + date.getMonth() * 31 + (date.getDate() - 1)) *
      86400 +
    date.getHours() * 3600 +
    date.getMinutes() * 60 +
    date.getSeconds()
  );
}

function decodeZkTime(value) {
  let t = Number(value);
  if (!Number.isFinite(t) || t <= 0) return null;
  const sec = t % 60;
  t = Math.floor(t / 60);
  const min = t % 60;
  t = Math.floor(t / 60);
  const hour = t % 24;
  t = Math.floor(t / 24);
  const day = (t % 31) + 1;
  t = Math.floor(t / 31);
  const month = t % 12;
  const year = Math.floor(t / 12) + 2000;
  return new Date(year, month, day, hour, min, sec);
}

function parseDeviceTime(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (/^\d{9,10}$/.test(s)) return decodeZkTime(s);
  const parsed = Date.parse(s.replace(" ", "T"));
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function makeEvent(partial) {
  return {
    id: `ACC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestampIso: partial.timestampIso || new Date().toISOString(),
    memberId: partial.memberId,
    memberName: partial.memberName || partial.memberId || "Desconocido",
    tier: partial.tier || "N/A",
    result: partial.result,
    reason: partial.reason,
    terminalId: partial.terminalId,
    deviceSerial: partial.deviceSerial,
    confidence: partial.confidence,
    captureSnapshotUrl: partial.captureSnapshotUrl,
    faceIdVendorRequestId: partial.faceIdVendorRequestId || `adms_${Date.now().toString(36)}`,
    turnstileVendorCommandId: partial.turnstileVendorCommandId || "device-local",
    source: "adms",
  };
}

function resolveEnroll(pin, payload) {
  const key = String(pin);
  const pending = pendingEnrolls.get(key);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingEnrolls.delete(key);
  pending.resolve(payload);
}

function resolveVerifyWaiters(terminalId, event) {
  const list = pendingVerifies.get(terminalId) || [];
  if (!list.length) return;
  pendingVerifies.delete(terminalId);
  for (const w of list) {
    clearTimeout(w.timer);
    w.resolve(event);
  }
}

/**
 * Registra un paso por el lector. Si la foto llegó antes que el registro, completa ese evento.
 * @returns {{ event?: object, merged?: boolean, duplicate?: boolean, skipped?: string }}
 */
function recordAccess({ sn, pin, when, result, reason, verify, statusTag, source }) {
  const terminalId = terminalIdFromSerial(sn) || `SN-${sn}`;
  const date = when || new Date();
  if (Date.now() - date.getTime() > MAX_LOG_AGE_MS) return { skipped: "old" };

  const knownPin = pin && pin !== "0" ? String(pin) : "";
  const memberId = knownPin ? `CLI-${knownPin}` : undefined;
  const timestampIso = date.toISOString();
  const near = (e) => Math.abs(Date.parse(e.timestampIso) - date.getTime()) < RECENT_MATCH_MS;

  const photoFirst = events.find(
    (e) =>
      e.photoOnly &&
      e.terminalId === terminalId &&
      (!e.memberId || e.memberId === memberId) &&
      near(e),
  );
  if (photoFirst) {
    Object.assign(photoFirst, {
      photoOnly: false,
      memberId,
      memberName: memberId || "Desconocido",
      result,
      reason,
      timestampIso,
      confidence: verify ? 0.95 : photoFirst.confidence,
    });
    resolveVerifyWaiters(terminalId, photoFirst);
    return { event: photoFirst, merged: true };
  }

  const duplicate = events.find(
    (e) =>
      !e.photoOnly &&
      e.terminalId === terminalId &&
      e.memberId === memberId &&
      Math.abs(Date.parse(e.timestampIso) - date.getTime()) < 2000,
  );
  if (duplicate) return { event: duplicate, duplicate: true };

  const evt = makeEvent({
    timestampIso,
    memberId,
    memberName: memberId || "Desconocido",
    tier: "ACCESS",
    result,
    reason,
    terminalId,
    deviceSerial: sn,
    confidence: verify ? 0.95 : undefined,
    faceIdVendorRequestId: `${source}_${knownPin || "0"}_${Date.now().toString(36)}`,
    turnstileVendorCommandId: statusTag,
  });
  pushEvent(evt);
  resolveVerifyWaiters(terminalId, evt);
  return { event: evt };
}

function handleAttLog(sn, bodyText) {
  const lines = String(bodyText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const stats = { lines: 0, events: 0, old: 0 };

  for (const line of lines) {
    // PIN TIME STATUS VERIFY [WORKCODE]
    const parts = line.split(/\t/);
    if (parts.length < 2) continue;
    stats.lines += 1;
    const pin = parts[0];
    const timeRaw = parts[1];
    const status = parts[2] ?? "0";
    const verify = parts[3] ?? "";
    const out = recordAccess({
      sn,
      pin,
      when: parseDeviceTime(timeRaw) || new Date(),
      result: "GRANTED",
      verify,
      statusTag: `wiegand_status_${status}`,
      source: "att",
    });
    if (out.skipped) {
      stats.old += 1;
      continue;
    }
    if (!out.duplicate) stats.events += 1;
    console.log(`[adms:attlog] SN=${sn} PIN=${pin} ${timeRaw}`);
    pushActivity(`${sn}: ATTLOG PIN=${pin} ${timeRaw}`, {
      serial: sn,
      kind: "attlog",
      pin,
    });
  }
  if (stats.old) {
    pushActivity(`${sn}: ATTLOG histórico ignorado (${stats.old} registros de más de 12 h)`, {
      serial: sn,
      kind: "attlog",
    });
  }
  return stats;
}

/** Eventos de control de acceso (firmware "Security PUSH"): 0–5 y 14–19 abren puerta. */
const RTLOG_GRANTED = new Set([0, 1, 2, 3, 4, 5, 14, 15, 16, 17, 18, 19]);
const RTLOG_REASONS = {
  20: "Intervalo muy corto",
  21: "Puerta fuera de horario",
  22: "Fuera de horario",
  23: "Acceso denegado",
  24: "Antipassback",
  25: "Interbloqueo",
  27: "Persona no registrada",
  29: "Vigencia vencida",
  30: "Contraseña incorrecta",
  41: "Modo de verificación incorrecto",
};

function handleRtLog(sn, bodyText) {
  const lines = String(bodyText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const stats = { lines: 0, events: 0, old: 0, system: 0 };

  for (const line of lines) {
    const f = parseLooseFields(line);
    stats.lines += 1;
    const code = Number(f.event ?? f.eventtype ?? f.eventcode);
    if (!Number.isFinite(code) || code >= 100 || (code >= 6 && code <= 13)) {
      stats.system += 1;
      continue;
    }
    const pin = f.pin || f.user || "";
    const granted = RTLOG_GRANTED.has(code);
    const out = recordAccess({
      sn,
      pin,
      when: parseDeviceTime(f.time || f.time_second) || new Date(),
      result: granted ? "GRANTED" : "DENIED",
      reason: granted ? undefined : RTLOG_REASONS[code] || `Evento ${code} del lector`,
      verify: f.verifytype || f.verified,
      statusTag: `rtlog_event_${code}`,
      source: "rt",
    });
    if (out.skipped) {
      stats.old += 1;
      continue;
    }
    if (!out.duplicate) stats.events += 1;
    console.log(`[adms:rtlog] SN=${sn} PIN=${pin || "-"} event=${code}`);
    pushActivity(`${sn}: RTLOG PIN=${pin || "-"} evento ${code}`, {
      serial: sn,
      kind: "attlog",
      pin,
    });
  }
  return stats;
}

function findEmbeddedJpeg(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return null;
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8 && buf[i + 2] === 0xff) {
      let end = buf.length;
      for (let j = i + 3; j < buf.length - 1; j++) {
        if (buf[j] === 0xff && buf[j + 1] === 0xd9) {
          end = j + 2;
          break;
        }
      }
      return buf.subarray(i, end);
    }
  }
  return null;
}

function previewFromBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return undefined;
  const jpeg = findEmbeddedJpeg(buf);
  const head = buf.subarray(0, Math.min(48, buf.length));
  const hex = [...head].map((b) => b.toString(16).padStart(2, "0")).join(" ");
  const asText = buf.toString("utf8", 0, Math.min(160, buf.length)).replace(/[^\x09\x0a\x0d\x20-\x7e]/g, ".");
  return jpeg
    ? `JPEG ${jpeg.length}B · hex ${hex}`
    : `hex ${hex} · txt ${asText.slice(0, 120)}`;
}

const BASE64_FIELDS = ["photo", "content", "pic", "image", "tmp", "data"];

/**
 * Extrae la imagen de un POST de foto. Formatos vistos en firmwares ZKTeco:
 *  - Texto "PIN=fecha-PIN.jpg\nSN=..\nsize=..\nCMD=uploadphoto\0" + JPEG binario
 *  - "pin=..\tsn=..\tsize=..\tphoto=<base64>" (o content=)
 *  - JPEG binario sin cabecera
 * @returns {{ jpeg: Buffer | null, fields: Record<string, string> }}
 */
function extractPhoto(buf) {
  const raw = Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf || ""));
  const binary = findEmbeddedJpeg(raw);
  if (binary) {
    const start = raw.indexOf(binary);
    const header = start > 0 ? raw.subarray(0, start).toString("latin1") : "";
    return { jpeg: Buffer.from(binary), fields: parseLooseFields(header) };
  }

  const fields = parseLooseFields(raw.toString("utf8"));
  for (const key of BASE64_FIELDS) {
    const value = fields[key];
    if (!value || value.length < 200) continue;
    const clean = value.replace(/^data:image\/\w+;base64,/, "").replace(/\s+/g, "");
    if (!/^[A-Za-z0-9+/=]+$/.test(clean)) continue;
    const decoded = Buffer.from(clean, "base64");
    if (decoded[0] === 0xff && decoded[1] === 0xd8) return { jpeg: decoded, fields };
  }
  return { jpeg: null, fields };
}

/**
 * @returns {{ attached: boolean, jpeg: boolean, saved?: string, pin?: string, note?: string }}
 */
function handleAttPhoto(sn, buf, query, { kind = "access" } = {}) {
  const terminalId = terminalIdFromSerial(sn) || `SN-${sn}`;
  const { jpeg, fields } = extractPhoto(buf);
  const pin =
    pinFromPhotoName(query.PIN || query.pin) ||
    pinFromPhotoName(fields.pin) ||
    pinFromPhotoName(fields.filename) ||
    "";

  if (!jpeg) {
    const dump = saveRawDump({ serial: sn, label: `${kind}-unparsed`, buf });
    console.log(
      `[adms:attphoto] SN=${sn} bytes=${Buffer.isBuffer(buf) ? buf.length : 0} (sin imagen parseable)${dump ? ` → captures/raw/${dump}` : ""}`,
    );
    pushActivity(`${sn}: ATTPHOTO sin imagen parseable`, {
      serial: sn,
      kind: "attphoto",
    });
    return {
      attached: false,
      jpeg: false,
      note: dump ? `sin imagen parseable · copia en captures/raw/${dump}` : "sin imagen parseable",
    };
  }

  const saved = savePhoto({ serial: sn, pin, jpeg, kind });
  const dataUrl = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

  if (kind === "biophoto") {
    pushActivity(`${sn}: foto de registro PIN=${pin || "-"} guardada`, {
      serial: sn,
      kind: "attphoto",
    });
    return { attached: false, jpeg: true, saved: saved?.id, pin, note: "foto de registro (no es un acceso)" };
  }

  const memberId = pin && pin !== "0" ? `CLI-${pin}` : undefined;
  const now = Date.now();
  const latest = events.find(
    (e) =>
      e.terminalId === terminalId &&
      !e.captureSnapshotUrl &&
      (!memberId || e.memberId === memberId) &&
      now - Date.parse(e.timestampIso) < RECENT_MATCH_MS * 5,
  );
  if (latest) {
    latest.captureSnapshotUrl = dataUrl;
    console.log(`[adms:attphoto] adjunto a ${latest.id}${saved ? ` (${saved.id}.jpg)` : ""}`);
    pushActivity(`${sn}: ATTPHOTO adjunto`, { serial: sn, kind: "attphoto" });
    return { attached: true, jpeg: true, saved: saved?.id, pin };
  }

  const evt = makeEvent({
    memberId,
    memberName: memberId || "Desconocido",
    result: memberId ? "GRANTED" : "DENIED",
    reason: memberId ? undefined : "Rostro sin coincidencia",
    terminalId,
    deviceSerial: sn,
    captureSnapshotUrl: dataUrl,
  });
  evt.photoOnly = true;
  pushEvent(evt);
  console.log(`[adms:attphoto] evento nuevo ${evt.id}${saved ? ` (${saved.id}.jpg)` : ""}`);
  pushActivity(`${sn}: ATTPHOTO (evento nuevo)`, { serial: sn, kind: "attphoto" });
  return { attached: true, jpeg: true, saved: saved?.id, pin };
}

function handleOperOrBio(sn, bodyText, table) {
  const lines = String(bodyText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // FACE PIN=.. Size=.. Valid=.. TMP=..
    // BIODATA Pin=.. Type=9 ...
    // USER PIN=.. Name=..
    if (line.startsWith("FACE ") || line.startsWith("BIODATA ") || line.includes("Type=9")) {
      const fields = parseTabFields(line.replace(/^(FACE|BIODATA)\s+/, ""));
      const pin = fields.PIN || fields.Pin || fields.pin;
      const tmp = fields.TMP || fields.Tmp || fields.template;
      if (pin) {
        const templateId = tmp
          ? `face_${pin}_${String(tmp).slice(0, 12)}`
          : `face_${pin}_${Date.now().toString(36)}`;
        console.log(`[adms:${table}] face PIN=${pin} SN=${sn}`);
        resolveEnroll(pin, {
          ok: true,
          templateId,
          pin: String(pin),
          deviceSerial: sn,
          qualityScore: fields.Valid === "0" ? 0.5 : 0.95,
        });
      }
    }
  }
}

function sendText(res, status, text, contentType = "text/plain") {
  const body = text ?? "";
  res.writeHead(status, {
    "Content-Type": `${contentType}; charset=utf-8`,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function traceBase(req, url, sn, table) {
  const qs = url.searchParams.toString();
  return {
    method: req.method,
    path: url.pathname,
    serial: sn || undefined,
    table: table || undefined,
    query: qs || undefined,
    contentType: req.headers["content-type"],
  };
}

/**
 * Opciones del servidor. Sirve a los dos dialectos del protocolo:
 * asistencia (TransFlag/Stamps) y control de acceso "Security PUSH" (registry/TransTables).
 * Sin "registry=ok" + RegistryCode, los firmwares nuevos repiten handshake+registry y nunca suben datos.
 */
function serverOptions(sn, pushver) {
  const code = registryCodeFor(sn);
  return [
    `GET OPTION FROM: ${sn}`,
    "registry=ok",
    `RegistryCode=${code}`,
    `SessionID=${code}`,
    "ServerVersion=3.1.2",
    "ServerName=EliteAccessGateway",
    `PushProtVer=${pushver || "2.4.1"}`,
    "ErrorDelay=30",
    "Delay=10",
    "RequestDelay=2",
    "TransTimes=00:00\t23:59",
    "TransInterval=1",
    "TransFlag=TransData AttLog\tOpLog\tAttPhoto\tEnrollUser\tChgUser\tEnrollFP\tChgFP\tEnrollFace\tChgFace\tUserPic\tBIODATA",
    "TransTables=User\tTransaction\tAttPhoto",
    "Realtime=1",
    "Encrypt=0",
    "TimeZone=-06:00",
    "Timeout=10",
    "TimeoutSec=10",
    "SyncTime=1",
    "ServerVer=EliteAccessGateway 2.0",
    "PushProtoType=1",
    "PushOptionsFlag=1",
    "AttLogStamp=0",
    "OpLogStamp=0",
    "PhotoStamp=0",
    `Stamp=${stampNow()}`,
  ].join("\n");
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

export async function handleAdms(req, res, url) {
  const sn = (url.searchParams.get("SN") || url.searchParams.get("sn") || "").trim();
  const rawTable = (url.searchParams.get("table") || "").toUpperCase();
  const tableName = (url.searchParams.get("tablename") || "").toUpperCase();
  const table = rawTable === "TABLEDATA" && tableName ? tableName : rawTable;
  const options = url.searchParams.get("options");
  const pushver = url.searchParams.get("pushver") || "";
  const base = traceBase(req, url, sn, table);

  if (sn) touchDevice(sn, pushver ? { pushver } : {});

  // Handshake inicial
  if (req.method === "GET" && url.pathname === "/iclock/cdata" && options === "all") {
    console.log(`[adms] handshake options SN=${sn}${pushver ? ` pushver=${pushver}` : ""}`);
    pushActivity(`${sn}: HANDSHAKE / options=all`, { serial: sn, kind: "handshake" });
    pushAdmsTrace({
      ...base,
      handledAs: "handshake",
      bytes: 0,
      note: `RegistryCode=${registryCodeFor(sn)}`,
    });
    return sendText(res, 200, serverOptions(sn, pushver));
  }

  if (url.pathname === "/iclock/registry") {
    const buf = req.method === "POST" ? await readBody(req) : Buffer.alloc(0);
    if (sn && buf.length) touchDevice(sn, parseKvLines(buf.toString("utf8")));
    const code = registryCodeFor(sn);
    console.log(`[adms] registry SN=${sn} → RegistryCode=${code}`);
    pushActivity(`${sn}: REGISTRY`, { serial: sn, kind: "registry" });
    pushAdmsTrace({
      ...base,
      handledAs: "registry",
      bytes: buf.length,
      preview: buf.length ? previewFromBuffer(buf) : undefined,
      note: `respuesta RegistryCode=${code}`,
    });
    return sendText(res, 200, `RegistryCode=${code}\n`);
  }

  // Paso siguiente al registro en firmwares nuevos: pide la configuración del servidor.
  if (url.pathname === "/iclock/push") {
    if (req.method === "POST") await readBody(req);
    pushActivity(`${sn}: registro completado (push)`, { serial: sn, kind: "registry" });
    pushAdmsTrace({ ...base, handledAs: "push-config", bytes: 0 });
    return sendText(res, 200, serverOptions(sn, pushver));
  }

  if (url.pathname === "/iclock/ping") {
    if (req.method === "POST") await readBody(req);
    pushAdmsTrace({ ...base, handledAs: "ping", noise: true });
    return sendText(res, 200, "OK");
  }

  if (req.method === "GET" && url.pathname === "/iclock/rtdata") {
    const type = (url.searchParams.get("type") || "").toLowerCase();
    pushAdmsTrace({ ...base, handledAs: `rtdata-${type || "?"}`, noise: true });
    if (type === "time") {
      return sendText(res, 200, `DateTime=${encodeZkTime()},ServerTZ=-0600`);
    }
    return sendText(res, 200, "OK");
  }

  if (req.method === "POST" && url.pathname === "/iclock/querydata") {
    const buf = await readBody(req);
    pushAdmsTrace({
      ...base,
      handledAs: "querydata",
      bytes: buf.length,
      preview: previewFromBuffer(buf),
    });
    return sendText(res, 200, "OK");
  }

  if (req.method === "GET" && url.pathname === "/iclock/getrequest") {
    if (!sn) {
      pushAdmsTrace({ ...base, handledAs: "getrequest-error", note: "missing SN" });
      return sendText(res, 400, "ERROR: missing SN");
    }
    const info = url.searchParams.get("INFO");
    if (info) {
      // INFO=FW,UserCount,FPCount,AttCount,IP,AlgFP,AlgFace,FaceNeed,FaceCount,FunFlag
      const parts = info.split(",");
      touchDevice(sn, {
        firmware: parts[0] || "",
        userCount: parts[1] || "",
        faceCount: parts[8] || parts[7] || "",
        ip: parts[4] || "",
      });
    }
    const cmds = drainCommands(sn);
    if (cmds) {
      console.log(`[adms:getrequest] SN=${sn} cmds queued`);
      pushActivity(`${sn}: GETREQUEST → comandos enviados`, {
        serial: sn,
        kind: "getrequest",
      });
      pushAdmsTrace({
        ...base,
        handledAs: "getrequest-cmds",
        preview: cmds.slice(0, 160),
      });
      return sendText(res, 200, cmds);
    }
    if (shouldLogPing(sn)) {
      pushActivity(`${sn}: GETREQUEST / PING`, { serial: sn, kind: "ping" });
    }
    pushAdmsTrace({
      ...base,
      handledAs: info ? "getrequest-info" : "ping",
      noise: true,
      preview: info ? `INFO=${info.slice(0, 120)}` : undefined,
    });
    return sendText(res, 200, "OK");
  }

  if (req.method === "POST" && url.pathname === "/iclock/devicecmd") {
    const buf = await readBody(req);
    const text = buf.toString("utf8");
    console.log(`[adms:devicecmd] SN=${sn} ${text.slice(0, 200)}`);
    // Una respuesta por línea: ID=1&Return=0&CMD=ENROLL_BIO
    const replies = [];
    for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
      const kv = Object.fromEntries(
        line.split("&").map((p) => {
          const i = p.indexOf("=");
          if (i === -1) return [p, ""];
          try {
            return [decodeURIComponent(p.slice(0, i)), decodeURIComponent(p.slice(i + 1))];
          } catch {
            return [p.slice(0, i), p.slice(i + 1)];
          }
        }),
      );
      const ret = Number(kv.Return ?? kv.return ?? 1);
      const cmd = String(kv.CMD || kv.Cmd || "");
      replies.push(`${cmd || "?"}=${ret}`);
      if ((cmd.includes("ENROLL_BIO") || cmd.includes("ENROLL_FP")) && ret === 0) {
        // Éxito enroll: si aún hay pending sin FACE, resolver por PIN en cola
        for (const [pin, pending] of pendingEnrolls) {
          if (pending.serial === sn) {
            resolveEnroll(pin, {
              ok: true,
              templateId: `enroll_${pin}_${Date.now().toString(36)}`,
              pin: String(pin),
              deviceSerial: sn,
              qualityScore: 0.92,
            });
            break;
          }
        }
      }
      if (ret !== 0 && (cmd.includes("ENROLL_BIO") || cmd.includes("ENROLL"))) {
        for (const [pin, pending] of pendingEnrolls) {
          if (pending.serial === sn) {
            clearTimeout(pending.timer);
            pendingEnrolls.delete(pin);
            pending.reject(new Error(`ENROLL falló en dispositivo (Return=${ret})`));
            break;
          }
        }
      }
    }
    pushAdmsTrace({
      ...base,
      handledAs: "devicecmd",
      bytes: buf.length,
      preview: text.slice(0, 200),
      note: replies.length ? `Return: ${replies.join(", ")}` : undefined,
    });
    return sendText(res, 200, "OK");
  }

  if (req.method === "POST" && url.pathname === "/iclock/cdata") {
    const buf = await readBody(req);
    const text = buf.toString("utf8");
    const jpeg = Boolean(findEmbeddedJpeg(buf));
    const query = Object.fromEntries(url.searchParams);
    const ok = () => sendText(res, 200, "OK");
    const statsNote = (s) =>
      `${s.events} acceso(s)` +
      (s.old ? ` · ${s.old} histórico(s) ignorado(s)` : "") +
      (s.system ? ` · ${s.system} evento(s) de sistema` : "");

    if (table === "ATTLOG" || table === "ATT_LOG" || table === "TRANSACTION") {
      const stats = table === "TRANSACTION" ? handleRtLog(sn, text) : handleAttLog(sn, text);
      pushAdmsTrace({
        ...base,
        handledAs: "attlog",
        bytes: buf.length,
        jpeg,
        preview: previewFromBuffer(buf),
        note: statsNote(stats),
      });
      return ok();
    }
    if (table === "RTLOG") {
      const stats = handleRtLog(sn, text);
      pushAdmsTrace({
        ...base,
        handledAs: stats.events ? "rtlog" : "rtlog-system",
        noise: !stats.events,
        bytes: buf.length,
        preview: previewFromBuffer(buf),
        note: statsNote(stats),
      });
      return ok();
    }
    if (table === "RTSTATE") {
      pushAdmsTrace({ ...base, handledAs: "rtstate", noise: true, bytes: buf.length });
      return ok();
    }
    if (table === "ATTPHOTO" || table === "ATT_PHOTO" || table === "BIOPHOTO" || table === "USERPIC" || jpeg) {
      const kind = table === "BIOPHOTO" || table === "USERPIC" ? "biophoto" : "access";
      const photo = handleAttPhoto(sn, buf, query, { kind });
      pushAdmsTrace({
        ...base,
        handledAs: photo.jpeg ? (kind === "biophoto" ? "biophoto" : "attphoto") : "attphoto-unparsed",
        bytes: buf.length,
        jpeg: photo.jpeg || jpeg,
        photoAttached: photo.attached,
        preview: previewFromBuffer(buf),
        note:
          photo.note ||
          [photo.pin ? `PIN=${photo.pin}` : "sin PIN", photo.saved ? `${photo.saved}.jpg` : null]
            .filter(Boolean)
            .join(" · "),
      });
      return ok();
    }
    if (table === "OPERLOG" || table === "BIODATA" || table === "FACE") {
      handleOperOrBio(sn, text, table || "OPERLOG");
      pushAdmsTrace({
        ...base,
        handledAs: table.toLowerCase(),
        bytes: buf.length,
        preview: previewFromBuffer(buf),
      });
      return ok();
    }
    if (table === "USERINFO" || table === "USER") {
      console.log(`[adms:userinfo] SN=${sn} bytes=${buf.length}`);
      pushAdmsTrace({
        ...base,
        handledAs: "userinfo",
        bytes: buf.length,
        preview: previewFromBuffer(buf),
      });
      return ok();
    }

    // Sin table conocida: guardar copia para analizar el formato.
    let handledAs = table ? `cdata-${table.toLowerCase()}` : "cdata";
    let note;
    if (text.includes("ATTLOG") || /^\d+\t/.test(text)) {
      note = statsNote(handleAttLog(sn, text));
      handledAs = "attlog-inferred";
    } else if (buf.length > 0) {
      const dump = saveRawDump({ serial: sn, label: table || "cdata", buf });
      if (dump) note = `copia en captures/raw/${dump}`;
    }
    pushAdmsTrace({
      ...base,
      handledAs,
      bytes: buf.length,
      jpeg,
      preview: previewFromBuffer(buf),
      note,
    });
    return ok();
  }

  pushAdmsTrace({ ...base, handledAs: "not-found", note: `${req.method} ${url.pathname}` });
  return sendText(res, 404, "NOT FOUND");
}

/**
 * Encola USERINFO + ENROLL_BIO (rostro luz visible Type=9) y espera resultado.
 */
export function enrollOnDevice({ serial, pin, displayName, timeoutSeconds = 120 }) {
  return new Promise((resolve, reject) => {
    const pinStr = String(pin);
    if (pendingEnrolls.has(pinStr)) {
      reject(new Error(`Ya hay un enrolamiento pendiente para PIN=${pinStr}`));
      return;
    }
    if (!isDeviceOnline(serial)) {
      reject(Object.assign(new Error(`Dispositivo ${serial} no está ONLINE (ADMS).`), { code: "DEVICE_OFFLINE" }));
      return;
    }

    const name = String(displayName || pinStr).replace(/[\t\r\n]/g, " ").slice(0, 24);
    queueCommand(
      serial,
      `DATA UPDATE USERINFO PIN=${pinStr}\tName=${name}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000100000000\tVerify=0`,
    );
    // Type=9 = visible light face (SpeedFace)
    queueCommand(
      serial,
      `ENROLL_BIO TYPE=9\tPIN=${pinStr}\tRETRY=3\tOVERWRITE=1`,
    );

    const timer = setTimeout(() => {
      pendingEnrolls.delete(pinStr);
      reject(Object.assign(new Error("Tiempo de captura agotado. El socio debe mirar al lector."), { code: "CAPTURE_TIMEOUT" }));
    }, Math.max(15, timeoutSeconds) * 1000);

    pendingEnrolls.set(pinStr, { resolve, reject, timer, serial });
    console.log(`[enroll] esperando captura PIN=${pinStr} SN=${serial} name=${name}`);
  });
}

export function waitForAccessEvent(terminalId, timeoutSeconds = 60) {
  return new Promise((resolve, reject) => {
    const serial = serialFromTerminalId(terminalId);
    if (serial && !isDeviceOnline(serial)) {
      reject(Object.assign(new Error(`Terminal ${terminalId} / ${serial} offline.`), { code: "DEVICE_OFFLINE" }));
      return;
    }
    const timer = setTimeout(() => {
      const list = pendingVerifies.get(terminalId) || [];
      pendingVerifies.set(
        terminalId,
        list.filter((w) => w.timer !== timer),
      );
      reject(Object.assign(new Error("Sin evento de acceso en el terminal."), { code: "CAPTURE_TIMEOUT" }));
    }, Math.max(5, timeoutSeconds) * 1000);

    if (!pendingVerifies.has(terminalId)) pendingVerifies.set(terminalId, []);
    pendingVerifies.get(terminalId).push({ resolve, reject, timer });
    console.log(`[verify] esperando ATTLOG en ${terminalId}`);
  });
}

export function listTerminalStatus() {
  return Object.entries(TERMINALS).map(([id, t]) => {
    const d = devices.get(t.serial);
    return {
      terminalId: id,
      serial: t.serial,
      label: t.label,
      online: isDeviceOnline(t.serial),
      lastSeenIso: d?.lastSeenIso ?? null,
      autoDetected: Boolean(t.autoDetected),
      firstSeenIso: t.firstSeenIso ?? null,
      info: d?.info ?? {},
    };
  });
}
