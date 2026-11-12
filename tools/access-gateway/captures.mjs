/**
 * Fotos que suben los lectores por ADMS, guardadas en disco junto al Gateway.
 * Carpeta: captures/ (o CAPTURES_DIR). Se conservan las últimas MAX_CAPTURES.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CAPTURES_DIR =
  process.env.CAPTURES_DIR ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), "captures");
const RAW_DIR = path.join(CAPTURES_DIR, "raw");
const MAX_PHOTOS = Math.max(20, Number(process.env.MAX_CAPTURES || 300));
const MAX_RAW = 40;
const VALID_ID = /^[A-Za-z0-9_-]{8,120}$/;

/** @type {Array<{ id: string, atIso: string, serial: string, pin: string, kind: string, bytes: number }>} */
const photos = [];

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (e) {
    console.error(`[captures] no se pudo crear ${dir}:`, e?.message || e);
    return false;
  }
}

function safePart(value, fallback) {
  const s = String(value || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);
  return s || fallback;
}

function fileStamp(date = new Date()) {
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}-${p(date.getMilliseconds(), 3)}`
  );
}

function parseFileName(name) {
  // 20261028-123045-123_SERIAL_PIN_kind.jpg
  const m = /^(\d{8})-(\d{6})-(\d{3})_([A-Za-z0-9-]+)_([A-Za-z0-9-]+)_([a-z]+)\.jpg$/.exec(name);
  if (!m) return null;
  const [, d, t, ms, serial, pin, kind] = m;
  const date = new Date(
    Number(d.slice(0, 4)),
    Number(d.slice(4, 6)) - 1,
    Number(d.slice(6, 8)),
    Number(t.slice(0, 2)),
    Number(t.slice(2, 4)),
    Number(t.slice(4, 6)),
    Number(ms),
  );
  return {
    id: name.replace(/\.jpg$/, ""),
    atIso: date.toISOString(),
    serial,
    pin: pin === "NA" ? "" : pin,
    kind,
  };
}

function loadExisting() {
  try {
    const names = fs.readdirSync(CAPTURES_DIR).filter((n) => n.endsWith(".jpg"));
    for (const name of names) {
      const meta = parseFileName(name);
      if (!meta) continue;
      let bytes = 0;
      try {
        bytes = fs.statSync(path.join(CAPTURES_DIR, name)).size;
      } catch {
        /* ignore */
      }
      photos.push({ ...meta, bytes });
    }
    photos.sort((a, b) => (a.id < b.id ? 1 : -1));
  } catch {
    /* carpeta aún no existe */
  }
}

loadExisting();

function prune() {
  while (photos.length > MAX_PHOTOS) {
    const old = photos.pop();
    try {
      fs.unlinkSync(path.join(CAPTURES_DIR, `${old.id}.jpg`));
    } catch {
      /* ya no existe */
    }
  }
}

/**
 * @param {{ serial: string, pin?: string, jpeg: Buffer, kind?: "access" | "biophoto" }} input
 */
export function savePhoto({ serial, pin, jpeg, kind = "access" }) {
  if (!Buffer.isBuffer(jpeg) || jpeg.length < 100) return null;
  if (!ensureDir(CAPTURES_DIR)) return null;
  const now = new Date();
  const id = `${fileStamp(now)}_${safePart(serial, "SN")}_${safePart(pin, "NA")}_${kind === "biophoto" ? "biophoto" : "access"}`;
  try {
    fs.writeFileSync(path.join(CAPTURES_DIR, `${id}.jpg`), jpeg);
  } catch (e) {
    console.error(`[captures] no se pudo guardar ${id}:`, e?.message || e);
    return null;
  }
  const row = {
    id,
    atIso: now.toISOString(),
    serial: String(serial || ""),
    pin: String(pin || ""),
    kind,
    bytes: jpeg.length,
  };
  photos.unshift(row);
  prune();
  return row;
}

export function listPhotos(limit = 24) {
  return photos.slice(0, Math.max(1, Math.min(MAX_PHOTOS, limit)));
}

export function photosCount() {
  return photos.length;
}

export function readPhoto(id) {
  if (!VALID_ID.test(String(id || ""))) return null;
  try {
    return fs.readFileSync(path.join(CAPTURES_DIR, `${id}.jpg`));
  } catch {
    return null;
  }
}

/** Guarda el cuerpo crudo de un POST que no se pudo interpretar, para analizar el formato. */
export function saveRawDump({ serial, label, buf }) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return null;
  if (!ensureDir(RAW_DIR)) return null;
  const name = `${fileStamp()}_${safePart(serial, "SN")}_${safePart(label, "raw")}.bin`;
  try {
    fs.writeFileSync(path.join(RAW_DIR, name), buf);
    const files = fs.readdirSync(RAW_DIR).filter((n) => n.endsWith(".bin")).sort();
    for (const old of files.slice(0, Math.max(0, files.length - MAX_RAW))) {
      fs.unlinkSync(path.join(RAW_DIR, old));
    }
    return name;
  } catch (e) {
    console.error(`[captures] no se pudo guardar dump ${name}:`, e?.message || e);
    return null;
  }
}
