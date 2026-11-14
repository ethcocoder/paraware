import { ArrowUpRight, MapPin } from 'lucide-react';
import { useLanguage } from '../i18n';
import { STATUS_INDEX, STATUSES } from '../constants';

export function PageLoader({ label }) {
  const { t } = useLanguage();
  return (
    <div className="page-loader" role="status">
      <span className="loader-ring" />
      <span>{label || t('common.loading')}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-icon">
          <Icon size={26} />
        </span>
      )}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action, description }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressSteps({ status, compact = false }) {
  const { t } = useLanguage();
  const current = STATUS_INDEX[status] ?? 0;
  return (
    <div className={`progress-steps ${compact ? 'compact' : ''}`}>
      {STATUSES.map((step, index) => (
        <div
          key={step}
          className={`progress-step ${index <= current ? 'done' : ''} ${
            index === current ? 'current' : ''
          }`}
        >
          <span className="progress-node">
            {index < current ? '✓' : index + 1}
          </span>
          <span className="progress-label">{t(`status.${step}`)}</span>
        </div>
      ))}
    </div>
  );
}

export function MapPanel({ location, height = 220 }) {
  const { t } = useLanguage();
  const lat = Number(location?.latitude);
  const lng = Number(location?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
    : null;
  return (
    <div className="map-panel" style={{ minHeight: height }}>
      <div className="map-grid" aria-hidden="true" />
      <div className="map-road road-a" aria-hidden="true" />
      <div className="map-road road-b" aria-hidden="true" />
      <div className="map-road road-c" aria-hidden="true" />
      <span className="map-block block-a" aria-hidden="true" />
      <span className="map-block block-b" aria-hidden="true" />
      <span className="map-block block-c" aria-hidden="true" />
      <span className="map-pin">
        <MapPin size={22} />
      </span>
      <div className="map-caption">
        <strong>{location?.name || t('common.notProvided')}</strong>
        <span>
          {hasCoords
            ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
            : t('common.notProvided')}
        </span>
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noreferrer">
            Open map <ArrowUpRight size={13} />
          </a>
        )}
      </div>
      <span className="map-label map-label-a">Kebele 08</span>
      <span className="map-label map-label-b">Woreda 04</span>
    </div>
  );
}

export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="tab-count">{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function OfflineBanner({ online }) {
  const { t } = useLanguage();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <span className="offline-dot" />
      {t('common.offline')}
    </div>
  );
}
