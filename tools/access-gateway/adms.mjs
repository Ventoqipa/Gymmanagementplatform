/**
 * Protocolo ADMS PUSH (ZKTeco) — productivo.
 * Endpoints: /iclock/cdata, /iclock/getrequest, /iclock/devicecmd, /iclock/registry
 */

import {
  drainCommands,
  devices,
  events,
  isDeviceOnline,
  pendingEnrolls,
  pendingVerifies,
  pushActivity,
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

function handleAttLog(sn, bodyText) {
  const terminalId = terminalIdFromSerial(sn) || `SN-${sn}`;
  const lines = String(bodyText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // PIN TIME STATUS VERIFY [WORKCODE]
    const parts = line.split(/\t/);
    if (parts.length < 2) continue;
    const pin = parts[0];
    const timeRaw = parts[1];
    const status = parts[2] ?? "0";
    const verify = parts[3] ?? "";
    let timestampIso;
    const parsed = Date.parse(timeRaw.replace(" ", "T"));
    timestampIso = Number.isNaN(parsed)
      ? new Date().toISOString()
      : new Date(parsed).toISOString();

    const memberId = `CLI-${pin}`;
    const evt = makeEvent({
      timestampIso,
      memberId,
      memberName: memberId,
      tier: "ACCESS",
      result: "GRANTED",
      terminalId,
      deviceSerial: sn,
      confidence: verify ? 0.95 : undefined,
      faceIdVendorRequestId: `att_${pin}_${Date.now().toString(36)}`,
      turnstileVendorCommandId: `wiegand_status_${status}`,
    });
    pushEvent(evt);
    resolveVerifyWaiters(terminalId, evt);
    console.log(`[adms:attlog] SN=${sn} PIN=${pin} ${timeRaw}`);
    pushActivity(`${sn}: ATTLOG PIN=${pin} ${timeRaw}`, {
      serial: sn,
      kind: "attlog",
      pin,
    });
  }
}

function handleAttPhoto(sn, bodyText, query) {
  const terminalId = terminalIdFromSerial(sn) || `SN-${sn}`;
  // Formatos comunes: PIN + timestamp + base64, o binario. Intentamos PIN= / photo.
  const pin = query.PIN || query.pin || "";
  let photo = bodyText;
  // A veces: "PIN=xx\tSN=..\tsize=..\tphoto=base64..."
  const fields = parseTabFields(bodyText);
  if (fields.photo || fields.Photo || fields.tmp || fields.TMP) {
    photo = fields.photo || fields.Photo || fields.tmp || fields.TMP;
  }
  const dataUrl =
    photo && !photo.startsWith("data:")
      ? photo.startsWith("/9j/") || /^[A-Za-z0-9+/=]+$/.test(photo.slice(0, 80))
        ? `data:image/jpeg;base64,${photo}`
        : undefined
      : photo;

  if (!dataUrl) {
    console.log(`[adms:attphoto] SN=${sn} (sin imagen parseable)`);
    return;
  }

  // Adjuntar al último evento del mismo PIN/terminal si existe.
  const memberId = pin ? `CLI-${pin}` : undefined;
  const latest = events.find(
    (e) =>
      e.terminalId === terminalId &&
      (!memberId || e.memberId === memberId) &&
      !e.captureSnapshotUrl,
  );
  if (latest) {
    latest.captureSnapshotUrl = dataUrl;
    console.log(`[adms:attphoto] adjunto a ${latest.id}`);
    pushActivity(`${sn}: ATTPHOTO adjunto`, { serial: sn, kind: "attphoto" });
    return;
  }

  const evt = makeEvent({
    memberId,
    memberName: memberId || "Captura",
    result: "GRANTED",
    terminalId,
    deviceSerial: sn,
    captureSnapshotUrl: dataUrl,
  });
  pushEvent(evt);
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

export async function handleAdms(req, res, url) {
  const sn = (url.searchParams.get("SN") || url.searchParams.get("sn") || "").trim();
  const table = (url.searchParams.get("table") || "").toUpperCase();
  const options = url.searchParams.get("options");

  if (sn) touchDevice(sn);

  // Handshake inicial
  if (req.method === "GET" && url.pathname === "/iclock/cdata" && options === "all") {
    const stamp = stampNow();
    const body = [
      `GET OPTION FROM: ${sn}`,
      "ErrorDelay=60",
      "Delay=30",
      "TransTimes=00:00\t23:59",
      "TransInterval=1",
      "TransFlag=TransData AttLog\tOpLog\tAttPhoto\tEnrollUser\tChgUser\tEnrollFP\tChgFP\tEnrollFace\tChgFace\tUserPic\tBIODATA",
      "Realtime=1",
      "Encrypt=0",
      "TimeZone=-06:00",
      "Timeout=10",
      "SyncTime=1",
      "ServerVer=EliteAccessGateway 1.0",
      "PushProtoType=1",
      "PushOptionsFlag=1",
      "AttLogStamp=0",
      "OpLogStamp=0",
      "PhotoStamp=0",
      `Stamp=${stamp}`,
    ].join("\n");
    console.log(`[adms] handshake options SN=${sn}`);
    pushActivity(`${sn}: HANDSHAKE / options=all`, { serial: sn, kind: "handshake" });
    return sendText(res, 200, body);
  }

  if (req.method === "GET" && url.pathname === "/iclock/registry") {
    return sendText(res, 200, "RegistryCode=EliteGym\n");
  }

  if (req.method === "POST" && url.pathname === "/iclock/registry") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const text = Buffer.concat(chunks).toString("utf8");
    if (sn) touchDevice(sn, parseKvLines(text));
    console.log(`[adms] registry SN=${sn}`);
    pushActivity(`${sn}: REGISTRY`, { serial: sn, kind: "registry" });
    return sendText(res, 200, "OK");
  }

  if (req.method === "GET" && url.pathname === "/iclock/getrequest") {
    if (!sn) return sendText(res, 400, "ERROR: missing SN");
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
      return sendText(res, 200, cmds);
    }
    if (shouldLogPing(sn)) {
      pushActivity(`${sn}: GETREQUEST / PING`, { serial: sn, kind: "ping" });
    }
    return sendText(res, 200, "OK");
  }

  if (req.method === "POST" && url.pathname === "/iclock/devicecmd") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const text = Buffer.concat(chunks).toString("utf8");
    console.log(`[adms:devicecmd] SN=${sn} ${text.slice(0, 200)}`);
    // ID=1&Return=0&CMD=ENROLL_BIO
    const kv = Object.fromEntries(
      text.split("&").map((p) => {
        const i = p.indexOf("=");
        return i === -1 ? [p, ""] : [decodeURIComponent(p.slice(0, i)), decodeURIComponent(p.slice(i + 1))];
      }),
    );
    const ret = Number(kv.Return ?? kv.return ?? 1);
    const cmd = String(kv.CMD || kv.Cmd || "");
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
    return sendText(res, 200, "OK");
  }

  if (req.method === "POST" && url.pathname === "/iclock/cdata") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const buf = Buffer.concat(chunks);
    const text = buf.toString("utf8");

    if (table === "ATTLOG" || table === "ATT_LOG") {
      handleAttLog(sn, text);
      return sendText(res, 200, "OK");
    }
    if (table === "ATTPHOTO" || table === "ATT_PHOTO") {
      handleAttPhoto(sn, text, Object.fromEntries(url.searchParams));
      return sendText(res, 200, "OK");
    }
    if (table === "OPERLOG" || table === "BIODATA" || table === "FACE") {
      handleOperOrBio(sn, text, table || "OPERLOG");
      return sendText(res, 200, "OK");
    }
    if (table === "USERINFO") {
      console.log(`[adms:userinfo] SN=${sn} bytes=${buf.length}`);
      return sendText(res, 200, "OK");
    }

    // Sin table: a veces options / stamp
    if (text.includes("ATTLOG") || /^\d+\t/.test(text)) {
      handleAttLog(sn, text);
    }
    return sendText(res, 200, "OK");
  }

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
      info: d?.info ?? {},
    };
  });
}
