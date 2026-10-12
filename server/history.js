import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, "[]");
}

function readAll() {
  ensureStore();
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records) {
  ensureStore();
  // Write to a temp file and rename, so a crash mid-write can't corrupt history.json.
  const tmpFile = `${HISTORY_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(records, null, 2));
  fs.renameSync(tmpFile, HISTORY_FILE);
}

export function listHistory() {
  return readAll()
    .map(({ id, businessName, contactName, monthly, sent, createdAt, updatedAt }) => ({
      id,
      businessName,
      contactName,
      monthly,
      sent: Boolean(sent),
      createdAt,
      updatedAt
    }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getHistoryRecord(id) {
  return readAll().find((r) => r.id === id) || null;
}

export function saveHistoryRecord(id, fields) {
  const records = readAll();
  const now = new Date().toISOString();

  if (id) {
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw Object.assign(new Error("No saved record with that id."), { status: 404 });
    }
    records[idx] = { ...records[idx], ...fields, id, updatedAt: now };
    writeAll(records);
    return records[idx];
  }

  const record = { ...fields, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  records.push(record);
  writeAll(records);
  return record;
}

export function deleteHistoryRecord(id) {
  const records = readAll();
  const next = records.filter((r) => r.id !== id);
  if (next.length === records.length) {
    throw Object.assign(new Error("No saved record with that id."), { status: 404 });
  }
  writeAll(next);
}
