import {
  Construction,
  Droplets,
  Trash2,
  Lightbulb,
  ShieldAlert,
  HeartPulse,
  MessageCircle,
} from 'lucide-react';

export const CATEGORIES = [
  { id: 'roads', label: 'Roads & transport', icon: Construction, color: '#A95D31' },
  { id: 'water', label: 'Water & sanitation', icon: Droplets, color: '#2F6E9E' },
  { id: 'waste', label: 'Waste management', icon: Trash2, color: '#497A4C' },
  { id: 'lighting', label: 'Street lighting', icon: Lightbulb, color: '#9A7424' },
  { id: 'safety', label: 'Public safety', icon: ShieldAlert, color: '#9A4444' },
  { id: 'health', label: 'Health & environment', icon: HeartPulse, color: '#397568' },
  { id: 'other', label: 'Other', icon: MessageCircle, color: '#6E7468' },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
);

export const STATUSES = [
  'submitted',
  'received',
  'acknowledged',
  'assigned',
  'under_review',
  'in_progress',
  'resolved',
  'closed',
];

export const STATUS_INDEX = Object.fromEntries(
  STATUSES.map((status, index) => [status, index])
);

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export const STAFF = [
  { id: 'user-selam', name: 'Selam Bekele', role: 'Administrator' },
  { id: 'user-yonas', name: 'Yonas Tadesse', role: 'Roads officer' },
];
