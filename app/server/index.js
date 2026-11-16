import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { all, get, run, transaction, hasSeedData, UPLOAD_DIR } from './db.js';
import {
  authenticate,
  createToken,
  hashPassword,
  publicUser,
  requireRole,
  verifyPassword,
} from './auth.js';
import { seedDatabase } from './seed.js';
import { analyzeReport } from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 4000);
const clientDist = path.join(__dirname, '..', 'client', 'dist');

if (!hasSeedData()) {
  seedDatabase();
  console.log('Seeded the Paraware pilot database.');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '14mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), camera=(self), microphone=()'
  );
  next();
});
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

const STATUSES = [
  'submitted',
  'received',
  'acknowledged',
  'assigned',
  'under_review',
  'in_progress',
  'resolved',
  'closed',
];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const AUTHORITY_ROLES = ['admin', 'officer'];

const STATUS_COPY = {
  submitted: ['Submitted', 'Your report has reached Paraware.'],
  received: ['Received', 'The Woreda 04 team has received your report.'],
  acknowledged: ['Acknowledged', 'An officer has confirmed receipt.'],
  assigned: ['Assigned', 'A responsible department is now handling the report.'],
  under_review: ['Under review', 'The department is investigating the problem.'],
  in_progress: ['In progress', 'Work to resolve the problem has started.'],
  resolved: ['Resolved', 'The Woreda has recorded a resolution.'],
  closed: ['Closed', 'The report is complete and has been closed.'],
};

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeUser(row, prefix = '') {
  if (!row) return null;
  return {
    id: row[`${prefix}id`],
    name: row[`${prefix}name`],
    role: row[`${prefix}role`] || 'citizen',
    phone: row[`${prefix}phone`] || null,
  };
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

function deriveTitle(description) {
  const clean = String(description || '').replace(/\s+/g, ' ').trim();
  const first = clean.split(/(?<=[.!?])\s/)[0] || clean;
  if (first.length <= 68) return first.replace(/[.!?]$/, '');
  return `${first.slice(0, 65).trim()}...`;
}

function saveDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw httpError(400, 'Please attach a JPEG, PNG or WebP photograph.');
  const mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (buffer.length > 10 * 1024 * 1024) {
    throw httpError(413, 'The photograph is too large. Please use one under 10 MB.');
  }
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime];
  const name = `${Date.now()}-${crypto.randomBytes(7).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

function reportRow(id) {
  return get(
    `SELECT r.*,
            d.name AS department_name,
            d.short_name AS department_short,
            d.color AS department_color,
            c.name AS citizen_name,
            c.phone AS citizen_phone,
            c.email AS citizen_email,
            a.name AS assignee_name,
            (SELECT COUNT(*) FROM messages m WHERE m.report_id = r.id AND m.is_internal = 0) AS message_count,
            (SELECT body FROM messages m WHERE m.report_id = r.id AND m.is_internal = 0 ORDER BY m.created_at DESC LIMIT 1) AS last_message
     FROM reports r
     JOIN users c ON c.id = r.citizen_id
     LEFT JOIN departments d ON d.id = r.department_id
     LEFT JOIN users a ON a.id = r.assigned_to
     WHERE r.id = ?`,
    id
  );
}

function serializeReport(row, { detail = false, viewerRole = null } = {}) {
  if (!row) return null;
  const [statusLabel, statusDescription] = STATUS_COPY[row.status] || [
    row.status,
    '',
  ];
  const result = {
    id: row.id,
    reference: row.reference,
    title: row.title,
    description: row.description,
    category: row.category,
    photoUrl: row.photo_url,
    location: {
      name: row.location_name,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    status: row.status,
    statusLabel,
    statusDescription,
    priority: row.priority,
    department: row.department_id
      ? {
          id: row.department_id,
          name: row.department_name,
          shortName: row.department_short,
          color: row.department_color,
        }
      : null,
    assignedTo: row.assigned_to
      ? { id: row.assigned_to, name: row.assignee_name }
      : null,
    citizen: {
      id: row.citizen_id,
      name: row.citizen_name,
      phone: row.citizen_phone,
      email: row.citizen_email,
    },
    aiSuggestion: parseJson(row.ai_suggestion),
    resolution: row.resolution_note
      ? { note: row.resolution_note, photoUrl: row.resolution_photo }
      : null,
    messageCount: Number(row.message_count || 0),
    lastMessage: row.last_message || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
  };
  if (viewerRole === 'citizen') {
    delete result.citizen.phone;
    delete result.citizen.email;
  }
  if (detail) {
    result.events = all(
      `SELECT e.id, e.type, e.note, e.created_at, e.actor_id,
              u.name AS actor_name, u.role AS actor_role
       FROM report_events e LEFT JOIN users u ON u.id = e.actor_id
       WHERE e.report_id = ? ORDER BY e.created_at ASC`,
      row.id
    ).map((e) => ({
      id: e.id,
      type: e.type,
      note: e.note,
      createdAt: e.created_at,
      actor: e.actor_id
        ? { id: e.actor_id, name: e.actor_name, role: e.actor_role }
        : null,
    }));
    result.messages = all(
      `SELECT m.id, m.body, m.is_internal, m.created_at, m.author_id,
              u.name AS author_name, u.role AS author_role
       FROM messages m JOIN users u ON u.id = m.author_id
       WHERE m.report_id = ? ${viewerRole === 'citizen' ? 'AND m.is_internal = 0' : ''}
       ORDER BY m.created_at ASC`,
      row.id
    ).map((m) => ({
      id: m.id,
      body: m.body,
      internal: Boolean(m.is_internal),
      createdAt: m.created_at,
      author: { id: m.author_id, name: m.author_name, role: m.author_role },
    }));
  }
  return result;
}

function addEvent(reportId, actorId, type, note, createdAt = new Date().toISOString()) {
  run(
    `INSERT INTO report_events (id, report_id, actor_id, type, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    reportId,
    actorId,
    type,
    note,
    createdAt
  );
}

function addNotification(userId, reportId, title, body, type = 'update') {
  if (!userId) return;
  run(
    `INSERT INTO notifications (id, user_id, report_id, title, body, type, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    crypto.randomUUID(),
    userId,
    reportId,
    title,
    body,
    type,
    new Date().toISOString()
  );
}

function notifyAuthorities(report, title, body, type) {
  const staff = all(
    `SELECT id FROM users WHERE role IN ('admin', 'officer')`
  );
  for (const person of staff) {
    addNotification(person.id, report.id, title, body, type);
  }
}

function addAudit(actorId, action, entityType, entityId, detail) {
  run(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    actorId,
    action,
    entityType,
    entityId,
    detail,
    new Date().toISOString()
  );
}

function nextReference() {
  let candidate = 1047;
  while (get('SELECT id FROM reports WHERE reference = ?', `PW-${candidate}`)) {
    candidate += 1;
  }
  return `PW-${candidate}`;
}

function canAccessReport(user, report) {
  if (!report) return false;
  if (user.role === 'citizen') return report.citizen_id === user.id;
  if (user.role === 'admin') return true;
  if (user.role === 'officer') {
    return (
      !report.department_id ||
      report.department_id === user.department_id ||
      report.assigned_to === user.id
    );
  }
  return false;
}

const loginAttempts = new Map();
function loginThrottle(req, _res, next) {
  const key = req.ip || 'unknown';
  const entry = loginAttempts.get(key) || { count: 0, reset: Date.now() + 15 * 60 * 1000 };
  if (Date.now() > entry.reset) {
    entry.count = 0;
    entry.reset = Date.now() + 15 * 60 * 1000;
  }
  if (entry.count >= 12) {
    return next(httpError(429, 'Too many sign-in attempts. Please wait 15 minutes.'));
  }
  loginAttempts.set(key, entry);
  req.loginEntry = entry;
  next();
}

function recordFailedLogin(req) {
  if (req.loginEntry) req.loginEntry.count += 1;
}

// ---------- Auth ----------

app.post('/api/auth/login', loginThrottle, (req, res) => {
  const identifier = String(req.body.identifier || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!identifier || !password) {
    throw httpError(400, 'Enter your phone number or email and password.');
  }
  const user = get(
    `SELECT u.*, d.name AS department_name FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE lower(u.email) = ? OR u.phone = ?`,
    identifier,
    normalizePhone(identifier)
  );
  if (!user || !verifyPassword(password, user.password_hash)) {
    recordFailedLogin(req);
    throw httpError(401, 'Those details do not match an account.');
  }
  addAudit(user.id, 'auth.signed_in', 'user', user.id, 'Signed in to Paraware');
  res.json({ token: createToken(user), user: publicUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = normalizePhone(req.body.phone);
  const email = String(req.body.email || '').trim().toLowerCase() || null;
  const password = String(req.body.password || '');
  const language = ['en', 'am', 'om'].includes(req.body.language)
    ? req.body.language
    : 'en';

  if (name.length < 2) throw httpError(400, 'Please enter your full name.');
  if (phone.replace(/\D/g, '').length < 9) {
    throw httpError(400, 'Please enter a valid phone number.');
  }
  if (password.length < 6) {
    throw httpError(400, 'Your password needs at least 6 characters.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, 'Please enter a valid email address.');
  }
  if (get('SELECT id FROM users WHERE phone = ?', phone)) {
    throw httpError(409, 'An account already uses this phone number.');
  }
  if (email && get('SELECT id FROM users WHERE lower(email) = ?', email)) {
    throw httpError(409, 'An account already uses this email address.');
  }

  const id = crypto.randomUUID();
  run(
    `INSERT INTO users (id, name, phone, email, password_hash, role, department_id, language, created_at)
     VALUES (?, ?, ?, ?, ?, 'citizen', NULL, ?, ?)`,
    id,
    name,
    phone,
    email,
    hashPassword(password),
    language,
    new Date().toISOString()
  );
  const user = get(
    `SELECT u.*, NULL AS department_name FROM users u WHERE u.id = ?`,
    id
  );
  addAudit(id, 'auth.registered', 'user', id, 'Citizen account created');
  res.status(201).json({ token: createToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.patch('/api/me', authenticate, (req, res) => {
  const language = ['en', 'am', 'om'].includes(req.body.language)
    ? req.body.language
    : req.user.language;
  const name = String(req.body.name || req.user.name).trim();
  run('UPDATE users SET name = ?, language = ? WHERE id = ?', name, language, req.user.id);
  const user = get(
    `SELECT u.*, d.name AS department_name FROM users u
     LEFT JOIN departments d ON d.id = u.department_id WHERE u.id = ?`,
    req.user.id
  );
  res.json({ user: publicUser(user) });
});

// ---------- Public ----------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'paraware-api', time: new Date().toISOString() });
});

app.get('/api/public/overview', (_req, res) => {
  const totals = get(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolved,
            SUM(CASE WHEN status IN ('in_progress', 'resolved', 'closed') THEN 1 ELSE 0 END) AS progressing
     FROM reports`
  );
  const departments = get('SELECT COUNT(*) AS count FROM departments');
  const announcements = all(
    `SELECT id, title, body, category, pinned, published_at
     FROM announcements ORDER BY pinned DESC, published_at DESC LIMIT 3`
  );
  const recentlyResolved = all(
    `SELECT r.reference, r.title, r.category, r.resolved_at, d.short_name AS department
     FROM reports r LEFT JOIN departments d ON d.id = r.department_id
     WHERE r.status IN ('resolved', 'closed') ORDER BY r.resolved_at DESC LIMIT 3`
  );
  res.json({
    totalReports: Number(totals.total || 0),
    resolvedReports: Number(totals.resolved || 0),
    progressingReports: Number(totals.progressing || 0),
    departments: Number(departments.count || 0),
    announcements,
    recentlyResolved,
  });
});

// ---------- Citizen home ----------

app.get('/api/citizen/home', authenticate, requireRole('citizen'), (req, res) => {
  const reports = all(
    `SELECT r.*, d.name AS department_name, d.short_name AS department_short,
            d.color AS department_color, c.name AS citizen_name, c.phone AS citizen_phone,
            c.email AS citizen_email,
            (SELECT COUNT(*) FROM messages m WHERE m.report_id = r.id AND m.is_internal = 0) AS message_count
     FROM reports r JOIN users c ON c.id = r.citizen_id
     LEFT JOIN departments d ON d.id = r.department_id
     WHERE r.citizen_id = ? ORDER BY r.created_at DESC`,
    req.user.id
  );
  const unread = get(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL',
    req.user.id
  );
  const announcements = all(
    `SELECT id, title, body, category, pinned, published_at
     FROM announcements ORDER BY pinned DESC, published_at DESC LIMIT 4`
  );
  res.json({
    reports: reports.map((r) => serializeReport(r, { viewerRole: 'citizen' })),
    announcements,
    unreadNotifications: Number(unread.count || 0),
    stats: {
      active: reports.filter((r) => !['resolved', 'closed'].includes(r.status)).length,
      resolved: reports.filter((r) => ['resolved', 'closed'].includes(r.status)).length,
      total: reports.length,
    },
  });
});

// ---------- Reports ----------

app.get('/api/reports', authenticate, (req, res) => {
  const conditions = [];
  const params = [];
  if (req.user.role === 'citizen') {
    conditions.push('r.citizen_id = ?');
    params.push(req.user.id);
  } else {
    if (req.query.mine === 'true') {
      conditions.push('(r.assigned_to = ? OR r.department_id = ?)');
      params.push(req.user.id, req.user.department_id || '');
    }
    if (req.query.department) {
      conditions.push('r.department_id = ?');
      params.push(req.query.department);
    }
    if (req.query.priority) {
      conditions.push('r.priority = ?');
      params.push(req.query.priority);
    }
    if (req.query.unacknowledged === 'true') {
      conditions.push("r.status IN ('submitted', 'received')");
    }
  }
  if (req.query.status) {
    const statuses = String(req.query.status)
      .split(',')
      .filter((s) => STATUSES.includes(s));
    if (statuses.length) {
      conditions.push(`r.status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
  }
  if (req.query.q) {
    const q = `%${String(req.query.q).trim()}%`;
    conditions.push(
      '(r.title LIKE ? OR r.description LIKE ? OR r.reference LIKE ? OR c.name LIKE ? OR r.location_name LIKE ?)'
    );
    params.push(q, q, q, q, q);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = all(
    `SELECT r.*, d.name AS department_name, d.short_name AS department_short,
            d.color AS department_color, c.name AS citizen_name, c.phone AS citizen_phone,
            c.email AS citizen_email, a.name AS assignee_name,
            (SELECT COUNT(*) FROM messages m WHERE m.report_id = r.id AND m.is_internal = 0) AS message_count,
            (SELECT body FROM messages m WHERE m.report_id = r.id AND m.is_internal = 0 ORDER BY m.created_at DESC LIMIT 1) AS last_message
     FROM reports r JOIN users c ON c.id = r.citizen_id
     LEFT JOIN departments d ON d.id = r.department_id
     LEFT JOIN users a ON a.id = r.assigned_to
     ${where}
     ORDER BY CASE r.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
              r.created_at DESC
     LIMIT 200`,
    ...params
  );
  res.json({
    reports: rows.map((r) =>
      serializeReport(r, { viewerRole: req.user.role })
    ),
  });
});

app.post(
  '/api/reports',
  authenticate,
  requireRole('citizen'),
  asyncRoute(async (req, res) => {
    const description = String(req.body.description || '').trim();
    const categoryInput = String(req.body.category || '').trim();
    const language = ['en', 'am', 'om'].includes(req.body.language)
      ? req.body.language
      : 'en';
    if (description.length < 10) {
      throw httpError(400, 'Please describe the problem in a little more detail.');
    }
    if (description.length > 3000) {
      throw httpError(400, 'Please keep the description under 3,000 characters.');
    }

    let photoUrl = String(req.body.photoUrl || '') || null;
    if (req.body.photoDataUrl) {
      photoUrl = saveDataUrl(req.body.photoDataUrl);
    }
    if (!photoUrl) {
      throw httpError(400, 'Please attach a photograph of the problem.');
    }

    const analysis = analyzeReport({ description, category: categoryInput });
    const category = categoryInput || analysis.category;
    const title = String(req.body.title || '').trim() || deriveTitle(description);
    const location = req.body.location || {};
    const lat = Number.isFinite(Number(location.latitude))
      ? Number(location.latitude)
      : null;
    const lng = Number.isFinite(Number(location.longitude))
      ? Number(location.longitude)
      : null;
    const locationName =
      String(location.name || '').trim() || 'Location not provided';
    const id = crypto.randomUUID();
    const reference = nextReference();
    const createdAt = new Date().toISOString();

    transaction(() => {
      run(
        `INSERT INTO reports
         (id, reference, citizen_id, title, description, category, photo_url, location_name,
          latitude, longitude, status, priority, department_id, assigned_to, ai_suggestion,
          resolution_note, resolution_photo, created_at, updated_at, acknowledged_at, resolved_at, closed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, NULL, ?, NULL, NULL, ?, ?, NULL, NULL, NULL)`,
        id,
        reference,
        req.user.id,
        title,
        description,
        category,
        photoUrl,
        locationName,
        lat,
        lng,
        analysis.priority === 'urgent' ? 'urgent' : analysis.priority,
        analysis.departmentId,
        JSON.stringify({ ...analysis, language }),
        createdAt,
        createdAt
      );
      addEvent(id, req.user.id, 'submitted', 'Report submitted by citizen.', createdAt);
      addNotification(
        req.user.id,
        id,
        'Report received',
        `Your report ${reference} has reached Woreda 04. You can follow every update here.`,
        'received'
      );
      const admins = all(
        `SELECT id FROM users WHERE role IN ('admin', 'officer')`
      );
      for (const admin of admins) {
        addNotification(
          admin.id,
          id,
          analysis.priority === 'urgent' ? 'New urgent report' : 'New citizen report',
          `${reference}: ${title}`,
          'new_report'
        );
      }
      addAudit(
        req.user.id,
        'report.submitted',
        'report',
        id,
        `Submitted ${reference}`
      );
    });

    const row = reportRow(id);
    res.status(201).json({
      report: serializeReport(row, { detail: true, viewerRole: 'citizen' }),
    });
  })
);

app.get('/api/reports/:id', authenticate, (req, res) => {
  let row = reportRow(req.params.id);
  if (!row) throw httpError(404, 'That report could not be found.');
  if (!canAccessReport(req.user, row)) {
    throw httpError(403, 'You do not have access to this report.');
  }

  if (
    AUTHORITY_ROLES.includes(req.user.role) &&
    row.status === 'submitted'
  ) {
    const receivedAt = new Date().toISOString();
    run(
      "UPDATE reports SET status = 'received', updated_at = ? WHERE id = ?",
      receivedAt,
      row.id
    );
    addEvent(row.id, req.user.id, 'received', 'Report received in the Woreda 04 inbox.', receivedAt);
    addAudit(req.user.id, 'report.received', 'report', row.id, `Received ${row.reference}`);
    addNotification(
      row.citizen_id,
      row.id,
      'Report received',
      `Woreda 04 has received your report ${row.reference}.`,
      'status'
    );
    row = reportRow(req.params.id);
  }

  const result = serializeReport(row, {
    detail: true,
    viewerRole: req.user.role,
  });

  if (AUTHORITY_ROLES.includes(req.user.role)) {
    const similar = all(
      `SELECT r.*, d.name AS department_name, d.short_name AS department_short,
              d.color AS department_color, c.name AS citizen_name, c.phone AS citizen_phone,
              c.email AS citizen_email, a.name AS assignee_name,
              (SELECT COUNT(*) FROM messages m WHERE m.report_id = r.id AND m.is_internal = 0) AS message_count
       FROM reports r JOIN users c ON c.id = r.citizen_id
       LEFT JOIN departments d ON d.id = r.department_id
       LEFT JOIN users a ON a.id = r.assigned_to
       WHERE r.id != ? AND r.status NOT IN ('closed')
         AND (r.category = ? OR r.department_id = ?)
       ORDER BY r.created_at DESC LIMIT 3`,
      row.id,
      row.category,
      row.department_id || ''
    );
    result.similarReports = similar.map((r) =>
      serializeReport(r, { viewerRole: req.user.role })
    );
  }

  res.json({ report: result });
});

app.post(
  '/api/reports/:id/messages',
  authenticate,
  asyncRoute(async (req, res) => {
    const report = reportRow(req.params.id);
    if (!report) throw httpError(404, 'That report could not be found.');
    if (!canAccessReport(req.user, report)) {
      throw httpError(403, 'You do not have access to this report.');
    }
    const body = String(req.body.body || '').trim();
    if (!body) throw httpError(400, 'Write a message before sending.');
    if (body.length > 2000) throw httpError(400, 'Please keep messages under 2,000 characters.');
    const isInternal =
      AUTHORITY_ROLES.includes(req.user.role) && Boolean(req.body.internal);

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    transaction(() => {
      run(
        `INSERT INTO messages (id, report_id, author_id, body, is_internal, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        id,
        report.id,
        req.user.id,
        body,
        isInternal ? 1 : 0,
        createdAt
      );
      addAudit(
        req.user.id,
        'message.sent',
        'report',
        report.id,
        `${isInternal ? 'Internal note' : 'Message'} on ${report.reference}`
      );
      if (!isInternal) {
        if (req.user.role === 'citizen') {
          notifyAuthorities(
            report,
            `New message on ${report.reference}`,
            `${req.user.name}: ${body.slice(0, 100)}`,
            'message'
          );
        } else {
          addNotification(
            report.citizen_id,
            report.id,
            `Update on ${report.reference}`,
            body.slice(0, 160),
            'message'
          );
        }
      }
    });

    const message = get(
      `SELECT m.*, u.name AS author_name, u.role AS author_role
       FROM messages m JOIN users u ON u.id = m.author_id WHERE m.id = ?`,
      id
    );
    res.status(201).json({
      message: {
        id: message.id,
        body: message.body,
        internal: Boolean(message.is_internal),
        createdAt: message.created_at,
        author: {
          id: message.author_id,
          name: message.author_name,
          role: message.author_role,
        },
      },
    });
  })
);

app.patch(
  '/api/reports/:id',
  authenticate,
  requireRole(...AUTHORITY_ROLES),
  asyncRoute(async (req, res) => {
    const report = reportRow(req.params.id);
    if (!report) throw httpError(404, 'That report could not be found.');
    if (!canAccessReport(req.user, report)) {
      throw httpError(403, 'This report is outside your department.');
    }

    const status = req.body.status ? String(req.body.status) : null;
    if (status && !STATUSES.includes(status)) {
      throw httpError(400, 'That report status is not valid.');
    }
    const priority = req.body.priority ? String(req.body.priority) : null;
    if (priority && !PRIORITIES.includes(priority)) {
      throw httpError(400, 'That priority is not valid.');
    }
    let departmentId = req.body.departmentId;
    if (departmentId !== undefined && departmentId !== null && departmentId !== '') {
      if (!get('SELECT id FROM departments WHERE id = ?', departmentId)) {
        throw httpError(400, 'That department could not be found.');
      }
    } else if (departmentId === '') {
      departmentId = null;
    }
    let assignedTo = req.body.assignedTo;
    if (assignedTo) {
      const assignee = get(
        "SELECT id FROM users WHERE id = ? AND role IN ('admin', 'officer')",
        assignedTo
      );
      if (!assignee) throw httpError(400, 'That officer could not be found.');
    }
    const requestedStatus = status || report.status;
    if (requestedStatus === 'resolved') {
      const note = String(
        req.body.resolutionNote || report.resolution_note || ''
      ).trim();
      if (note.length < 10) {
        throw httpError(
          400,
          'Add a short resolution note before marking the report resolved.'
        );
      }
    }
    const resolutionPhoto =
      req.body.resolutionPhotoDataUrl
        ? saveDataUrl(req.body.resolutionPhotoDataUrl)
        : req.body.resolutionPhotoUrl || report.resolution_photo;
    const nowIso = new Date().toISOString();
    const updates = [];
    const params = [];
    const pushUpdate = (field, value) => {
      updates.push(`${field} = ?`);
      params.push(value);
    };

    if (status) pushUpdate('status', status);
    if (priority) pushUpdate('priority', priority);
    if (departmentId !== undefined) pushUpdate('department_id', departmentId);
    if (assignedTo !== undefined) pushUpdate('assigned_to', assignedTo || null);
    if (req.body.resolutionNote !== undefined) {
      pushUpdate('resolution_note', String(req.body.resolutionNote).trim() || null);
    }
    if (resolutionPhoto !== report.resolution_photo) {
      pushUpdate('resolution_photo', resolutionPhoto || null);
    }
    if (status === 'acknowledged' && !report.acknowledged_at) {
      pushUpdate('acknowledged_at', nowIso);
    }
    if (status === 'resolved') pushUpdate('resolved_at', nowIso);
    if (status === 'closed') {
      pushUpdate('closed_at', nowIso);
      if (!report.resolved_at) {
        pushUpdate('resolved_at', nowIso);
      }
    }
    pushUpdate('updated_at', nowIso);
    params.push(report.id);

    const changes = [];
    if (status && status !== report.status) {
      changes.push(`Status moved to ${STATUS_COPY[status][0]}`);
    }
    if (priority && priority !== report.priority) {
      changes.push(`Priority set to ${priority}`);
    }
    if (departmentId !== undefined && departmentId !== report.department_id) {
      const dept = departmentId
        ? get('SELECT name FROM departments WHERE id = ?', departmentId)
        : null;
      changes.push(dept ? `Assigned to ${dept.name}` : 'Department cleared');
    }
    if (assignedTo !== undefined && assignedTo !== report.assigned_to) {
      const person = assignedTo
        ? get('SELECT name FROM users WHERE id = ?', assignedTo)
        : null;
      changes.push(person ? `Assigned to ${person.name}` : 'Assignee cleared');
    }

    transaction(() => {
      run(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`, ...params);

      if (status && status !== report.status) {
        addEvent(
          report.id,
          req.user.id,
          status,
          req.body.note
            ? String(req.body.note).slice(0, 500)
            : STATUS_COPY[status][1],
          nowIso
        );
        const statusTitle =
          status === 'resolved'
            ? `Your report ${report.reference} is resolved`
            : status === 'closed'
              ? `Your report ${report.reference} is closed`
              : `Update on ${report.reference}`;
        addNotification(
          report.citizen_id,
          report.id,
          statusTitle,
          req.body.note
            ? String(req.body.note).slice(0, 180)
            : STATUS_COPY[status][1],
          'status'
        );
        addAudit(
          req.user.id,
          status === 'resolved'
            ? 'report.resolved'
            : status === 'closed'
              ? 'report.closed'
              : status === 'acknowledged'
                ? 'report.acknowledged'
                : 'report.status_changed',
          'report',
          report.id,
          `${report.reference}: ${STATUS_COPY[status][0]}`
        );
      }
      if (departmentId !== undefined && departmentId !== report.department_id) {
        addEvent(
          report.id,
          req.user.id,
          'assigned',
          departmentId
            ? `Assigned to ${get('SELECT name FROM departments WHERE id = ?', departmentId).name}${assignedTo ? ` (${get('SELECT name FROM users WHERE id = ?', assignedTo)?.name})` : ''}`
            : 'Department assignment cleared',
          nowIso
        );
        addAudit(
          req.user.id,
          'report.assigned',
          'report',
          report.id,
          `${report.reference}: department updated`
        );
      }
      if (req.body.note) {
        addEvent(
          report.id,
          req.user.id,
          'note',
          String(req.body.note).slice(0, 500),
          nowIso
        );
      }
    });

    const updated = reportRow(report.id);
    res.json({
      report: serializeReport(updated, {
        detail: true,
        viewerRole: req.user.role,
      }),
      changes,
    });
  })
);

// ---------- Departments ----------

app.get('/api/departments', authenticate, (req, res) => {
  if (req.user.role === 'citizen') {
    const rows = all(
      `SELECT id, name, short_name, description, color, icon, email
       FROM departments ORDER BY name`
    );
    return res.json({ departments: rows });
  }
  const rows = all(
    `SELECT d.id, d.name, d.short_name, d.description, d.color, d.icon, d.email,
            COUNT(r.id) AS report_count,
            SUM(CASE WHEN r.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolved_count,
            SUM(CASE WHEN r.status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS active_count
     FROM departments d LEFT JOIN reports r ON r.department_id = d.id
     GROUP BY d.id ORDER BY d.name`
  );
  res.json({
    departments: rows.map((d) => ({
      ...d,
      reportCount: Number(d.report_count || 0),
      resolvedCount: Number(d.resolved_count || 0),
      activeCount: Number(d.active_count || 0),
    })),
  });
});

app.get('/api/staff', authenticate, requireRole(...AUTHORITY_ROLES), (_req, res) => {
  const staff = all(
    `SELECT u.id, u.name, u.role, u.department_id, d.short_name AS department
     FROM users u LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.role IN ('admin', 'officer') ORDER BY u.name`
  );
  res.json({ staff });
});

// ---------- Announcements ----------

app.get('/api/announcements', authenticate, (_req, res) => {
  const rows = all(
    `SELECT a.*, u.name AS author_name FROM announcements a
     LEFT JOIN users u ON u.id = a.author_id
     ORDER BY a.pinned DESC, a.published_at DESC`
  );
  res.json({
    announcements: rows.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      category: a.category,
      pinned: Boolean(a.pinned),
      publishedAt: a.published_at,
      author: a.author_name,
    })),
  });
});

app.post(
  '/api/announcements',
  authenticate,
  requireRole('admin'),
  (req, res) => {
    const title = String(req.body.title || '').trim();
    const body = String(req.body.body || '').trim();
    const category = String(req.body.category || 'General').trim();
    const pinned = Boolean(req.body.pinned);
    if (title.length < 3) throw httpError(400, 'Add a title for the announcement.');
    if (body.length < 10) throw httpError(400, 'Add the announcement message.');
    const id = crypto.randomUUID();
    const publishedAt = new Date().toISOString();
    transaction(() => {
      run(
        `INSERT INTO announcements (id, title, body, category, author_id, pinned, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        title,
        body,
        category,
        req.user.id,
        pinned ? 1 : 0,
        publishedAt
      );
      const citizens = all("SELECT id FROM users WHERE role = 'citizen'");
      for (const c of citizens) {
        addNotification(
          c.id,
          null,
          title,
          body.slice(0, 160),
          'announcement'
        );
      }
      addAudit(
        req.user.id,
        'announcement.published',
        'announcement',
        id,
        `Published "${title}"`
      );
    });
    res.status(201).json({
      announcement: {
        id,
        title,
        body,
        category,
        pinned,
        publishedAt,
        author: req.user.name,
      },
    });
  }
);

// ---------- Notifications ----------

app.get('/api/notifications', authenticate, (req, res) => {
  const rows = all(
    `SELECT n.*, r.reference FROM notifications n
     LEFT JOIN reports r ON r.id = n.report_id
     WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 60`,
    req.user.id
  );
  res.json({
    notifications: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      reportId: n.report_id,
      reference: n.reference,
      read: Boolean(n.read_at),
      createdAt: n.created_at,
    })),
    unread: rows.filter((n) => !n.read_at).length,
  });
});

app.post('/api/notifications/read', authenticate, (req, res) => {
  const id = req.body.id;
  if (id) {
    run(
      'UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?',
      new Date().toISOString(),
      id,
      req.user.id
    );
  } else {
    run(
      'UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL',
      new Date().toISOString(),
      req.user.id
    );
  }
  res.json({ ok: true });
});

// ---------- Authority dashboard ----------

app.get('/api/stats', authenticate, requireRole(...AUTHORITY_ROLES), (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const newToday = get(
    'SELECT COUNT(*) AS count FROM reports WHERE created_at >= ?',
    startOfDay.toISOString()
  );
  const awaiting = get(
    "SELECT COUNT(*) AS count FROM reports WHERE status IN ('submitted', 'received')"
  );
  const active = get(
    "SELECT COUNT(*) AS count FROM reports WHERE status IN ('acknowledged', 'assigned', 'under_review', 'in_progress')"
  );
  const resolvedMonth = get(
    "SELECT COUNT(*) AS count FROM reports WHERE status IN ('resolved', 'closed') AND resolved_at >= ?",
    startOfMonth.toISOString()
  );
  const total = get('SELECT COUNT(*) AS count FROM reports');
  const acknowledged = get(
    'SELECT COUNT(*) AS count FROM reports WHERE acknowledged_at IS NOT NULL'
  );
  const avg = get(
    `SELECT AVG((julianday(acknowledged_at) - julianday(created_at)) * 24) AS hours
     FROM reports WHERE acknowledged_at IS NOT NULL`
  );
  const byCategory = all(
    `SELECT category, COUNT(*) AS count FROM reports GROUP BY category ORDER BY count DESC`
  );
  const byStatus = all(
    `SELECT status, COUNT(*) AS count FROM reports GROUP BY status`
  );
  const recentActivity = all(
    `SELECT a.id, a.action, a.detail, a.created_at, u.name AS actor_name
     FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC LIMIT 6`
  );
  res.json({
    stats: {
      newToday: Number(newToday.count || 0),
      awaiting: Number(awaiting.count || 0),
      active: Number(active.count || 0),
      resolvedMonth: Number(resolvedMonth.count || 0),
      total: Number(total.count || 0),
      acknowledgementRate: total.count
        ? Math.round((Number(acknowledged.count) / Number(total.count)) * 100)
        : 0,
      avgAcknowledgementHours: avg.hours
        ? Number(avg.hours).toFixed(1)
        : null,
      byCategory,
      byStatus,
    },
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      detail: a.detail,
      createdAt: a.created_at,
      actor: a.actor_name,
    })),
  });
});

app.get('/api/audit', authenticate, requireRole(...AUTHORITY_ROLES), (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 250);
  const rows = all(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.detail, a.created_at,
            u.name AS actor_name, u.role AS actor_role
     FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC LIMIT ?`,
    limit
  );
  res.json({ audit: rows });
});

// ---------- Media ----------

app.post('/api/media', authenticate, (req, res) => {
  const url = saveDataUrl(req.body.dataUrl);
  if (!url) throw httpError(400, 'No photograph was received.');
  res.status(201).json({ url });
});

// ---------- Error handling + client ----------

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error:
      status >= 500
        ? 'Something went wrong on our side. Please try again.'
        : err.message,
  });
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h' }));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      service: 'Paraware API',
      message: 'Run `npm run dev` for the app, or `npm run build` and restart for production.',
    });
  });
}

export { app };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, () => {
    console.log(`Paraware API listening on http://localhost:${PORT}`);
  });
}
