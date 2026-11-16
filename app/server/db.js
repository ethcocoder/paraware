import alasql from 'alasql';
import fs from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const TABLES = {
  departments: ['id', 'name', 'short_name', 'description', 'color', 'icon', 'email', 'created_at'],
  users: ['id', 'name', 'phone', 'email', 'password_hash', 'role', 'department_id', 'language', 'created_at'],
  reports: ['id', 'reference', 'citizen_id', 'title', 'description', 'category', 'photo_url', 'location_name', 'latitude', 'longitude', 'status', 'priority', 'department_id', 'assigned_to', 'ai_suggestion', 'resolution_note', 'resolution_photo', 'created_at', 'updated_at', 'acknowledged_at', 'resolved_at', 'closed_at'],
  report_events: ['id', 'report_id', 'actor_id', 'type', 'note', 'created_at'],
  messages: ['id', 'report_id', 'author_id', 'body', 'is_internal', 'created_at'],
  notifications: ['id', 'user_id', 'report_id', 'title', 'body', 'type', 'read_at', 'created_at'],
  announcements: ['id', 'title', 'body', 'category', 'author_id', 'pinned', 'published_at'],
  audit_logs: ['id', 'actor_id', 'action', 'entity_type', 'entity_id', 'detail', 'created_at'],
};

const primaryKeys = Object.fromEntries(Object.keys(TABLES).map((table) => [table, 'id']));
const firestoreEnabled = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
const memory = new Map();
let firestore = null;
let persistQueue = Promise.resolve();

for (const [table, columns] of Object.entries(TABLES)) {
  alasql(`CREATE TABLE ${table} (${columns.map((column) => `${column} STRING`).join(', ')})`);
  memory.set(table, alasql.tables[table].data);
}

function serviceAccount() {
  try {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return { ...parsed, private_key: parsed.private_key.replace(/\\n/g, '\n') };
  } catch (error) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is invalid: ${error.message}`);
  }
}

if (firestoreEnabled) {
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount()) });
  firestore = getFirestore(app);
}

async function hydrate() {
  if (!firestore) return;
  for (const table of Object.keys(TABLES)) {
    const snapshot = await firestore.collection(table).get();
    memory.get(table).push(...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }
}

export const firestoreReady = hydrate();

function tableFromSql(sql) {
  const match = String(sql).match(/\b(?:FROM|INTO|UPDATE|JOIN|TABLE)\s+([a-z_]+)/i);
  return match?.[1]?.toLowerCase() || null;
}

function query(sql, params = []) {
  const text = String(sql).trim();
  if (/julianday\(acknowledged_at\)/i.test(text)) {
    const rows = memory.get('reports').filter((row) => row.acknowledged_at);
    const hours = rows.length
      ? rows.reduce((sum, row) => sum + (Date.parse(row.acknowledged_at) - Date.parse(row.created_at)) / 3600000, 0) / rows.length
      : null;
    return [{ hours }];
  }
  const reservedAliases = ['count', 'total', 'resolved', 'progressing', 'active', 'awaiting', 'newToday', 'resolvedMonth'];
  const aliasMap = new Map();
  const safeText = text.replace(/\bAS\s+([a-z_][a-z0-9_]*)\b/gi, (full, alias) => {
    if (!reservedAliases.includes(alias.toLowerCase())) return full;
    const safeAlias = `__${alias}`;
    aliasMap.set(safeAlias, alias);
    return `AS ${safeAlias}`;
  });
  const result = alasql(safeText, params);
  if (!Array.isArray(result)) return result;
  return result.map((row) => {
    for (const [safeAlias, alias] of aliasMap) {
      if (Object.prototype.hasOwnProperty.call(row, safeAlias)) {
        row[alias] = row[safeAlias];
        delete row[safeAlias];
      }
    }
    return row;
  });
}

function enqueuePersistence(table) {
  if (!firestore || !TABLES[table]) return;
  persistQueue = persistQueue.then(async () => {
    const collection = firestore.collection(table);
    const existing = await collection.get();
    const writer = firestore.batch();
    existing.docs.forEach((doc) => writer.delete(doc.ref));
    for (const row of memory.get(table)) {
      const id = String(row[primaryKeys[table]] || '');
      if (id) writer.set(collection.doc(id), { ...row });
    }
    await writer.commit();
  }).catch((error) => console.error(`Firestore sync failed for ${table}:`, error));
}

export function all(sql, ...params) {
  return query(sql, params);
}

export function get(sql, ...params) {
  return query(sql, params)[0] || undefined;
}

export function run(sql, ...params) {
  const result = query(sql, params);
  enqueuePersistence(tableFromSql(sql));
  return result;
}

export function transaction(fn) {
  const result = fn();
  for (const table of Object.keys(TABLES)) enqueuePersistence(table);
  return result;
}

export function hasSeedData() {
  return Boolean(get('SELECT id FROM users LIMIT 1'));
}

export const DATA_DIR = null;
export const UPLOAD_DIR = '/tmp/paraware-uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = {
  prepare(sql) {
    return {
      all: (...params) => all(sql, ...params),
      get: (...params) => get(sql, ...params),
      run: (...params) => run(sql, ...params),
    };
  },
  exec(sql) {
    for (const statement of String(sql).split(';').map((part) => part.trim()).filter(Boolean)) {
      if (/^(PRAGMA|CREATE TABLE)/i.test(statement)) continue;
      run(statement);
    }
  },
};

export { db };
