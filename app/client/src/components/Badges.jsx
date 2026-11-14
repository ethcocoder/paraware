import { CATEGORY_MAP } from '../constants';
import { useLanguage } from '../i18n';

export function StatusBadge({ status, className = '' }) {
  const { t } = useLanguage();
  return (
    <span className={`status-badge status-${status} ${className}`}>
      <span className="status-dot" />
      {t(`status.${status}`)}
    </span>
  );
}

export function PriorityBadge({ priority, showLabel = true }) {
  const { t } = useLanguage();
  if (!priority) return null;
  return (
    <span className={`priority-badge priority-${priority}`}>
      <span className="priority-dot" />
      {showLabel && t(`priority.${priority}`)}
    </span>
  );
}

export function CategoryPill({ category, subtle = false }) {
  const { t } = useLanguage();
  const data = CATEGORY_MAP[category] || CATEGORY_MAP.other;
  const Icon = data.icon;
  return (
    <span className={`category-pill ${subtle ? 'subtle' : ''}`}>
      <Icon size={14} strokeWidth={2} style={{ color: data.color }} />
      {t(`category.${data.id}`)}
    </span>
  );
}

export function DepartmentPill({ department }) {
  if (!department) return <span className="muted">—</span>;
  return (
    <span className="department-pill">
      <span className="department-dot" style={{ background: department.color }} />
      {department.shortName || department.name}
    </span>
  );
}
