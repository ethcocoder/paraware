const LOCALES = { en: 'en-US', am: 'am-ET', om: 'om-ET' };

export function timeAgo(value, lang = 'en') {
  if (!value) return '';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  const locale = LOCALES[lang] || 'en-US';
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return rtf.format(-days, 'day');
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }
}

export function formatDate(value, lang = 'en', options = {}) {
  if (!value) return '';
  const locale = LOCALES[lang] || 'en-US';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...options,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleDateString();
  }
}

export function formatTime(value, lang = 'en') {
  if (!value) return '';
  const locale = LOCALES[lang] || 'en-US';
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleTimeString();
  }
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function greetingKey(hour = new Date().getHours()) {
  if (hour < 12) return 'greeting.morning';
  if (hour < 18) return 'greeting.afternoon';
  return 'greeting.evening';
}

export function excerpt(value = '', max = 150) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}...`;
}
