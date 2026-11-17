import crypto from 'node:crypto';
import { db, run, transaction } from './db.js';
import { hashPassword } from './auth.js';
import { analyzeReport } from './ai.js';

const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const ago = (days = 0, hours = 0, minutes = 0) =>
  iso(now - ((days * 24 + hours) * 60 + minutes) * 60 * 1000);
const uid = () => crypto.randomUUID();

const departments = [
  ['dept-roads', 'Infrastructure & Roads', 'Roads', 'Potholes, sidewalks, bridges and road damage.', '#D97745', 'road', 'roads@woreda04.gov.et'],
  ['dept-water', 'Water & Sanitation', 'Water', 'Leaks, drainage, flooding and sanitation.', '#3E7CB1', 'droplets', 'water@woreda04.gov.et'],
  ['dept-waste', 'Waste Management', 'Waste', 'Collection, illegal dumping and public cleanliness.', '#4F7D51', 'trash', 'waste@woreda04.gov.et'],
  ['dept-lighting', 'Electricity & Lighting', 'Lighting', 'Streetlights, exposed wires and dark public spaces.', '#B48A2C', 'lightbulb', 'lighting@woreda04.gov.et'],
  ['dept-safety', 'Public Safety', 'Safety', 'Unsafe structures, guardrails and public hazards.', '#A34A4A', 'shield', 'safety@woreda04.gov.et'],
  ['dept-health', 'Health & Environment', 'Health', 'Public health risks and environmental concerns.', '#3F7C72', 'heart', 'health@woreda04.gov.et'],
];

const users = [
  {
    id: 'user-hana',
    name: 'Hana Tesfaye',
    phone: '0911223344',
    email: 'hana@example.com',
    password: 'paraware',
    role: 'citizen',
    departmentId: null,
    language: 'en',
    createdAt: ago(46),
  },
  {
    id: 'user-dawit',
    name: 'Dawit Bekele',
    phone: '0912345678',
    email: 'dawit@example.com',
    password: 'paraware',
    role: 'citizen',
    departmentId: null,
    language: 'am',
    createdAt: ago(31),
  },
  {
    id: 'user-meron',
    name: 'Meron Alemu',
    phone: '0913456789',
    email: 'meron@example.com',
    password: 'paraware',
    role: 'citizen',
    departmentId: null,
    language: 'om',
    createdAt: ago(22),
  },
  {
    id: 'user-selam',
    name: 'Selam Bekele',
    phone: '0911000001',
    email: 'selam@woreda04.gov.et',
    password: 'woreda04',
    role: 'admin',
    departmentId: null,
    language: 'en',
    createdAt: ago(60),
  },
  {
    id: 'user-yonas',
    name: 'Yonas Tadesse',
    phone: '0911000002',
    email: 'yonas@woreda04.gov.et',
    password: 'woreda04',
    role: 'officer',
    departmentId: 'dept-roads',
    language: 'am',
    createdAt: ago(45),
  },
  {
    id: 'user-admin-main',
    name: 'Woreda 04 Administrator',
    phone: '0973634455',
    email: 'admin@paraware.et',
    password: '12345678@',
    role: 'admin',
    departmentId: null,
    language: 'en',
    createdAt: ago(90),
  },
];

const reports = [
  {
    id: 'report-1',
    reference: 'PW-1042',
    citizenId: 'user-hana',
    title: 'Deep pothole at the Kirkos market crossing',
    description:
      'A deep pothole has opened in the middle of the crossing near Kirkos market. It fills with water when it rains and cars swerve into the walking lane to avoid it. Children cross here on their way to school in the morning.',
    category: 'roads',
    photo: '/demo/pothole2.jpg',
    location: 'Kirkos market crossing, Woreda 04',
    lat: 9.0107,
    lng: 38.7612,
    status: 'in_progress',
    priority: 'urgent',
    departmentId: 'dept-roads',
    assignedTo: 'user-yonas',
    createdAt: ago(3, 2),
    updatedAt: ago(0, 5),
    acknowledgedAt: ago(2, 21),
    resolvedAt: null,
    closedAt: null,
    resolutionNote: null,
    resolutionPhoto: null,
    events: [
      ['submitted', 'user-hana', 'Report submitted by citizen.', ago(3, 2)],
      ['received', 'user-selam', 'Report received in the Woreda 04 inbox.', ago(3, 1)],
      ['acknowledged', 'user-selam', 'Receipt confirmed. The roads team has been alerted.', ago(2, 21)],
      ['assigned', 'user-selam', 'Assigned to Infrastructure & Roads (Yonas Tadesse).', ago(2, 19)],
      ['under_review', 'user-yonas', 'Site visit scheduled for the next morning.', ago(2, 4)],
      ['in_progress', 'user-yonas', 'Repair crew is preparing the road patch.', ago(0, 5)],
    ],
    messages: [
      ['user-selam', 'Thank you, Hana. We have confirmed the report and assigned it to our roads team. Please keep clear of the crossing while the crew works.', false, ago(2, 18)],
      ['user-hana', 'Thank you. The hole is getting wider after the rain. I will send another photo if it changes.', false, ago(2, 7)],
      ['user-yonas', 'The crew has marked the area and will begin the patch this afternoon. We expect to reopen the lane before evening.', false, ago(0, 5)],
    ],
  },
  {
    id: 'report-2',
    reference: 'PW-1041',
    citizenId: 'user-dawit',
    title: 'Overflowing waste bins beside Bole Michael school',
    description:
      'The waste containers beside Bole Michael Primary School have not been collected for more than a week. Trash is spilling onto the sidewalk and the smell is strong near the school gate. Students walk through it every morning.',
    category: 'waste',
    photo: '/demo/waste.jpg',
    location: 'Bole Michael Primary School, Woreda 04',
    lat: 8.9991,
    lng: 38.7684,
    status: 'acknowledged',
    priority: 'high',
    departmentId: 'dept-waste',
    assignedTo: null,
    createdAt: ago(1, 4),
    updatedAt: ago(0, 8),
    acknowledgedAt: ago(0, 8),
    resolvedAt: null,
    closedAt: null,
    resolutionNote: null,
    resolutionPhoto: null,
    events: [
      ['submitted', 'user-dawit', 'Report submitted by citizen.', ago(1, 4)],
      ['received', 'user-selam', 'Report received in the Woreda 04 inbox.', ago(1, 3)],
      ['acknowledged', 'user-selam', 'Receipt confirmed. Waste collection has been notified.', ago(0, 8)],
    ],
    messages: [
      ['user-selam', 'Thank you, Dawit. We have informed the waste collection team. We will confirm the collection time here.', false, ago(0, 8)],
    ],
  },
  {
    id: 'report-3',
    reference: 'PW-1046',
    citizenId: 'user-hana',
    title: 'Streetlight out along Kebele 08 lane',
    description:
      'The streetlight on the lane behind the Kebele 08 office has been dark for four nights. The lane is very dark after 6pm and women and children are avoiding it. There is also an exposed wire at the base of the pole.',
    category: 'lighting',
    photo: '/demo/light2.jpg',
    location: 'Kebele 08 office lane, Woreda 04',
    lat: 9.0063,
    lng: 38.7541,
    status: 'submitted',
    priority: 'urgent',
    departmentId: 'dept-lighting',
    assignedTo: null,
    createdAt: ago(0, 2),
    updatedAt: ago(0, 2),
    acknowledgedAt: null,
    resolvedAt: null,
    closedAt: null,
    resolutionNote: null,
    resolutionPhoto: null,
    events: [
      ['submitted', 'user-hana', 'Report submitted by citizen.', ago(0, 2)],
    ],
    messages: [],
  },
  {
    id: 'report-4',
    reference: 'PW-1038',
    citizenId: 'user-meron',
    title: 'Water pipe leaking onto the main road',
    description:
      'A water pipe is leaking continuously beside the main road near the Kebele 05 junction. Water is running across the asphalt and the ground is becoming soft. It has been leaking since Sunday and is getting worse.',
    category: 'water',
    photo: '/demo/water2.jpg',
    location: 'Kebele 05 junction, Woreda 04',
    lat: 9.0142,
    lng: 38.7489,
    status: 'under_review',
    priority: 'high',
    departmentId: 'dept-water',
    assignedTo: null,
    createdAt: ago(5, 3),
    updatedAt: ago(1, 1),
    acknowledgedAt: ago(4, 20),
    resolvedAt: null,
    closedAt: null,
    resolutionNote: null,
    resolutionPhoto: null,
    events: [
      ['submitted', 'user-meron', 'Report submitted by citizen.', ago(5, 3)],
      ['received', 'user-selam', 'Report received in the Woreda 04 inbox.', ago(5, 2)],
      ['acknowledged', 'user-selam', 'Receipt confirmed. The water team has been notified.', ago(4, 20)],
      ['assigned', 'user-selam', 'Assigned to Water & Sanitation.', ago(4, 18)],
      ['under_review', 'user-selam', 'Water team is checking the line pressure and leak point.', ago(1, 1)],
    ],
    messages: [
      ['user-selam', 'Thank you, Meron. We have reported the leak to the water utility team. Please avoid the soft ground near the junction.', false, ago(4, 20)],
    ],
  },
  {
    id: 'report-5',
    reference: 'PW-1029',
    citizenId: 'user-dawit',
    title: 'Road edge collapsing beside the health center',
    description:
      'The road shoulder outside the Woreda health center has collapsed into the stream and the guardrail is hanging loose. The walkway is no longer safe, especially for the school children who use this path in the afternoon.',
    category: 'safety',
    photo: '/demo/washout.jpg',
    location: 'Woreda 04 Health Center, Woreda 04',
    lat: 9.0026,
    lng: 38.7761,
    status: 'resolved',
    priority: 'high',
    departmentId: 'dept-safety',
    assignedTo: null,
    createdAt: ago(12, 4),
    updatedAt: ago(2, 3),
    acknowledgedAt: ago(11, 22),
    resolvedAt: ago(2, 3),
    closedAt: null,
    resolutionNote:
      'The damaged section of the guardrail was removed and replaced with a new galvanized section. The walkway was cleared and the repair was checked by the site supervisor.',
    resolutionPhoto: '/demo/evidence-guardrail.jpg',
    events: [
      ['submitted', 'user-dawit', 'Report submitted by citizen.', ago(12, 4)],
      ['received', 'user-selam', 'Report received in the Woreda 04 inbox.', ago(12, 3)],
      ['acknowledged', 'user-selam', 'Receipt confirmed. Public safety team notified.', ago(11, 22)],
      ['assigned', 'user-selam', 'Assigned to Public Safety.', ago(11, 20)],
      ['under_review', 'user-selam', 'Site inspection completed.', ago(8, 2)],
      ['in_progress', 'user-selam', 'Replacement guardrail section ordered.', ago(6, 1)],
      ['resolved', 'user-selam', 'Guardrail replaced and walkway reopened. Evidence uploaded.', ago(2, 3)],
    ],
    messages: [
      ['user-selam', 'The damaged rail has been replaced. Thank you for reporting this before someone was hurt.', false, ago(2, 2)],
    ],
  },
  {
    id: 'report-6',
    reference: 'PW-1015',
    citizenId: 'user-hana',
    title: 'Standing water after rain near Kebele 05',
    description:
      'After every heavy rain, water stands in the low part of the road near Kebele 05 and does not drain for days. It becomes a mosquito breeding area and makes it difficult for people to reach the bus stop.',
    category: 'water',
    photo: '/demo/water2.jpg',
    location: 'Kebele 05 bus stop, Woreda 04',
    lat: 9.0151,
    lng: 38.7512,
    status: 'closed',
    priority: 'normal',
    departmentId: 'dept-water',
    assignedTo: null,
    createdAt: ago(20, 3),
    updatedAt: ago(9, 2),
    acknowledgedAt: ago(19, 20),
    resolvedAt: ago(10, 4),
    closedAt: ago(9, 2),
    resolutionNote:
      'The drainage channel was cleared of silt and debris, and the low point was re-graded so water can flow to the main drain. The area was checked after the last rainfall.',
    resolutionPhoto: '/demo/evidence.jpg',
    events: [
      ['submitted', 'user-hana', 'Report submitted by citizen.', ago(20, 3)],
      ['received', 'user-selam', 'Report received in the Woreda 04 inbox.', ago(20, 2)],
      ['acknowledged', 'user-selam', 'Receipt confirmed. Water & Sanitation team notified.', ago(19, 20)],
      ['assigned', 'user-selam', 'Assigned to Water & Sanitation.', ago(19, 18)],
      ['under_review', 'user-selam', 'Drainage team inspected the low point.', ago(15, 1)],
      ['in_progress', 'user-selam', 'Silt and debris removal started.', ago(13, 2)],
      ['resolved', 'user-selam', 'Drain cleared and road re-graded.', ago(10, 4)],
      ['closed', 'user-selam', 'Citizen confirmed the area is dry. Report closed.', ago(9, 2)],
    ],
    messages: [
      ['user-selam', 'The drain has been cleared and the low point re-graded. Please let us know if water still collects after the next rain.', false, ago(10, 3)],
      ['user-hana', 'We had rain yesterday and the water drained normally. Thank you.', false, ago(9, 4)],
    ],
  },
];

const announcements = [
  {
    id: 'announcement-1',
    title: 'Water service maintenance in Kebele 05',
    body:
      'Water service will be interrupted in parts of Kebele 05 on Saturday from 8:00am to 2:00pm while the utility repairs the main line. Please store enough water for the morning. We are sorry for the inconvenience.',
    category: 'Service notice',
    authorId: 'user-selam',
    pinned: 1,
    publishedAt: ago(0, 4),
  },
  {
    id: 'announcement-2',
    title: 'Community cleanup this Saturday',
    body:
      'Join the Woreda 04 community cleanup at 8:00am this Saturday. We will meet at the Kebele 08 office. Gloves, bags and refreshments will be provided. Everyone is welcome.',
    category: 'Community',
    authorId: 'user-selam',
    pinned: 0,
    publishedAt: ago(2, 3),
  },
  {
    id: 'announcement-3',
    title: 'Paraware is now open to residents',
    body:
      'You can now report public problems directly to Woreda 04 using Paraware. Take a photo, describe what you see, and follow every step until the problem is resolved. If you need help, call the Woreda office.',
    category: 'Announcement',
    authorId: 'user-selam',
    pinned: 0,
    publishedAt: ago(8, 2),
  },
];

export function seedDatabase({ force = false } = {}) {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (!force && Number(existing.count) > 0) return false;

  transaction(() => {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM notifications;
      DELETE FROM messages;
      DELETE FROM report_events;
      DELETE FROM reports;
      DELETE FROM announcements;
      DELETE FROM users;
      DELETE FROM departments;
    `);

    const insertDepartment = db.prepare(
      `INSERT INTO departments (id, name, short_name, description, color, icon, email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const d of departments) insertDepartment.run(...d, ago(90));

    const insertUser = db.prepare(
      `INSERT INTO users (id, name, phone, email, password_hash, role, department_id, language, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const u of users) {
      insertUser.run(
        u.id,
        u.name,
        u.phone,
        u.email,
        hashPassword(u.password),
        u.role,
        u.departmentId,
        u.language,
        u.createdAt
      );
    }

    const insertReport = db.prepare(
      `INSERT INTO reports
       (id, reference, citizen_id, title, description, category, photo_url, location_name,
        latitude, longitude, status, priority, department_id, assigned_to, ai_suggestion,
        resolution_note, resolution_photo, created_at, updated_at, acknowledged_at, resolved_at, closed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertEvent = db.prepare(
      `INSERT INTO report_events (id, report_id, actor_id, type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertMessage = db.prepare(
      `INSERT INTO messages (id, report_id, author_id, body, is_internal, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (const r of reports) {
      const ai = analyzeReport({
        title: r.title,
        description: r.description,
        category: r.category,
      });
      insertReport.run(
        r.id,
        r.reference,
        r.citizenId,
        r.title,
        r.description,
        r.category,
        r.photo,
        r.location,
        r.lat,
        r.lng,
        r.status,
        r.priority,
        r.departmentId,
        r.assignedTo,
        JSON.stringify(ai),
        r.resolutionNote,
        r.resolutionPhoto,
        r.createdAt,
        r.updatedAt,
        r.acknowledgedAt,
        r.resolvedAt,
        r.closedAt
      );
      for (const [type, actorId, note, createdAt] of r.events) {
        insertEvent.run(uid(), r.id, actorId, type, note, createdAt);
      }
      for (const [authorId, body, isInternal, createdAt] of r.messages) {
        insertMessage.run(uid(), r.id, authorId, body, isInternal ? 1 : 0, createdAt);
      }
    }

    const insertAnnouncement = db.prepare(
      `INSERT INTO announcements (id, title, body, category, author_id, pinned, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const a of announcements) {
      insertAnnouncement.run(
        a.id,
        a.title,
        a.body,
        a.category,
        a.authorId,
        a.pinned,
        a.publishedAt
      );
    }

    const insertNotification = db.prepare(
      `INSERT INTO notifications (id, user_id, report_id, title, body, type, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertNotification.run(
      uid(),
      'user-selam',
      'report-3',
      'New urgent report',
      'A streetlight is out and a wire is exposed on the Kebele 08 lane.',
      'new_report',
      null,
      ago(0, 2)
    );
    insertNotification.run(
      uid(),
      'user-selam',
      'report-2',
      'Citizen replied',
      'Dawit asked when the waste collection will happen.',
      'message',
      null,
      ago(0, 6)
    );
    insertNotification.run(
      uid(),
      'user-hana',
      'report-1',
      'Your report is in progress',
      'The roads crew has started the repair at Kirkos market crossing.',
      'status',
      null,
      ago(0, 5)
    );
    insertNotification.run(
      uid(),
      'user-hana',
      'report-6',
      'Report closed',
      'Your drainage report is closed. Thank you for helping Woreda 04.',
      'status',
      ago(8, 4),
      ago(9, 2)
    );
    insertNotification.run(
      uid(),
      'user-hana',
      null,
      'Water service maintenance',
      'Water will be interrupted in Kebele 05 on Saturday from 8:00am to 2:00pm.',
      'announcement',
      null,
      ago(0, 4)
    );

    const insertAudit = db.prepare(
      `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const audits = [
      ['user-selam', 'report.acknowledged', 'report', 'report-2', 'Acknowledged PW-1041', ago(0, 8)],
      ['user-selam', 'report.assigned', 'report', 'report-1', 'Assigned PW-1042 to Infrastructure & Roads', ago(2, 19)],
      ['user-selam', 'report.status_changed', 'report', 'report-6', 'PW-1015 closed', ago(9, 2)],
      ['user-selam', 'announcement.published', 'announcement', 'announcement-1', 'Published water maintenance notice', ago(0, 4)],
      ['user-selam', 'report.resolved', 'report', 'report-5', 'PW-1029 resolved with evidence', ago(2, 3)],
      ['user-yonas', 'report.status_changed', 'report', 'report-1', 'PW-1042 moved to In Progress', ago(0, 5)],
    ];
    for (const a of audits) insertAudit.run(uid(), ...a);
  });

  return true;
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isDirectRun) {
  const created = seedDatabase({ force: process.argv.includes('--force') });
  console.log(created ? 'Paraware demo database seeded.' : 'Database already contains data.');
}
