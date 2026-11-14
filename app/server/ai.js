const CATEGORY_RULES = [
  {
    id: 'roads',
    label: 'Roads & transport',
    departmentId: 'dept-roads',
    words: [
      'pothole', 'road', 'street', 'bridge', 'guardrail', 'sidewalk', 'pavement',
      'traffic', 'drain', 'culvert', 'መንገድ', 'ጉድጓድ', 'ድልድይ', 'karaa', 'boollaa',
      'daandii', 'rizoo',
    ],
  },
  {
    id: 'water',
    label: 'Water & sanitation',
    departmentId: 'dept-water',
    words: [
      'water', 'pipe', 'leak', 'tap', 'sewer', 'flood', 'drainage', 'toilet',
      'መጸዳጃ', 'ውሃ', 'ቧንቧ', 'ጎርፍ', 'bishaan', 'uyiifama', 'tuba', 'bishaan dhangala’aa',
    ],
  },
  {
    id: 'waste',
    label: 'Waste management',
    departmentId: 'dept-waste',
    words: [
      'garbage', 'trash', 'waste', 'litter', 'dump', 'rubbish', 'smell',
      'ቆሻሻ', 'መጣያ', 'kosii', 'balfaa', 'faayidaa hin qabne',
    ],
  },
  {
    id: 'lighting',
    label: 'Street lighting',
    departmentId: 'dept-lighting',
    words: [
      'light', 'lamp', 'lamp post', 'streetlight', 'electric', 'wire', 'dark',
      'መብራት', 'ኤሌክትሪክ', 'ጨለማ', 'ibsaa', 'humna ibsaa', 'dunkanaa',
    ],
  },
  {
    id: 'safety',
    label: 'Public safety',
    departmentId: 'dept-safety',
    words: [
      'danger', 'unsafe', 'accident', 'injury', 'crime', 'stray dog', 'collapsed',
      'wall', 'open hole', 'school', 'children', 'አደጋ', 'ፍርሃት', 'ደህንነት',
      'balaa', 'naamusa', 'daa’imman',
    ],
  },
  {
    id: 'health',
    label: 'Health & environment',
    departmentId: 'dept-health',
    words: [
      'health', 'clinic', 'hospital', 'mosquito', 'stagnant', 'pollution', 'smoke',
      'ጤና', 'ሆስፒታል', 'ትንኝ', 'ፍሳሽ', 'fayyaa', 'hospitaala', 'biqiltuu',
    ],
  },
];

const URGENT_WORDS = [
  'urgent', 'danger', 'dangerous', 'accident', 'injury', 'child', 'children',
  'school', 'electric', 'live wire', 'fire', 'flood', 'collapsed', 'exposed',
  'open hole', 'emergency', 'አደጋ', 'ፍጥነት', 'ልጅ', 'ትምህርት ቤት', 'balaa', 'hatattamaa',
  'daa’imman', 'mana barumsaa',
];

const HIGH_WORDS = [
  'blocked', 'overflow', 'leak', 'broken', 'damaged', 'unsafe', 'market',
  'main road', 'hospital', 'clinic', 'weeks', 'months', 'ውሃ', 'ቆሻሻ', 'መንገድ',
  'bishaan', 'kosii', 'karaa',
];

function scoreCategory(text) {
  const normalized = ` ${text.toLowerCase()} `;
  let best = { id: 'other', label: 'Other', departmentId: null, score: 0 };
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const word of rule.words) {
      if (normalized.includes(word.toLowerCase())) {
        score += word.includes(' ') ? 2 : 1;
      }
    }
    if (score > best.score) {
      best = { ...rule, score };
    }
  }
  return best;
}

export function analyzeReport({ title = '', description = '', category = '' }) {
  const text = `${title} ${description} ${category}`.trim();
  const scored = scoreCategory(text);
  const lower = text.toLowerCase();

  let priority = 'normal';
  if (URGENT_WORDS.some((word) => lower.includes(word))) priority = 'urgent';
  else if (HIGH_WORDS.some((word) => lower.includes(word))) priority = 'high';

  const confidence = scored.score
    ? Math.min(0.94, 0.58 + scored.score * 0.09)
    : 0.42;

  const firstSentence = description.split(/(?<=[.!?])\s/)[0] || description;
  const summary =
    firstSentence.length > 180
      ? `${firstSentence.slice(0, 177).trim()}...`
      : firstSentence;

  return {
    category: scored.id,
    categoryLabel: scored.label,
    departmentId: scored.departmentId,
    priority,
    confidence: Number(confidence.toFixed(2)),
    summary,
    similarHint: scored.id === 'other' ? null : scored.label,
    generatedAt: new Date().toISOString(),
    disclaimer:
      'Paraware Assist only suggests. An authorized Woreda officer makes the final decision.',
  };
}
