import { Link } from 'react-router-dom';
import { MapPin, MessageCircle, ArrowUpRight, Clock3 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { timeAgo, excerpt } from '../format';
import { CategoryPill, PriorityBadge, StatusBadge } from './Badges';

export function CitizenReportCard({ report, featured = false }) {
  const { t, lang } = useLanguage();
  const resolved = ['resolved', 'closed'].includes(report.status);
  return (
    <Link
      to={`/app/reports/${report.id}`}
      className={`citizen-report-card ${featured ? 'featured' : ''} ${
        resolved ? 'is-resolved' : ''
      }`}
    >
      <div className="report-thumb">
        {report.photoUrl ? (
          <img src={report.photoUrl} alt="" loading="lazy" />
        ) : (
          <span className="thumb-fallback" />
        )}
        <StatusBadge status={report.status} className="thumb-status" />
      </div>
      <div className="report-card-body">
        <div className="report-meta-row">
          <CategoryPill category={report.category} subtle />
          <span className="report-ref">{report.reference}</span>
        </div>
        <h3>{report.title}</h3>
        {!featured && <p>{excerpt(report.description, 105)}</p>}
        <div className="report-foot">
          <span className="report-location">
            <MapPin size={13} /> {report.location?.name || t('common.notProvided')}
          </span>
          <span className="report-updated">
            <Clock3 size={13} /> {timeAgo(report.updatedAt, lang)}
          </span>
          {report.messageCount > 0 && (
            <span className="report-messages">
              <MessageCircle size={13} /> {report.messageCount}
            </span>
          )}
        </div>
      </div>
      <span className="report-arrow">
        <ArrowUpRight size={18} />
      </span>
    </Link>
  );
}

export function AuthorityReportRow({ report, selected = false }) {
  const { t, lang } = useLanguage();
  return (
    <Link
      to={`/authority/reports/${report.id}`}
      className={`authority-report-row ${selected ? 'selected' : ''} ${
        ['submitted', 'received'].includes(report.status) ? 'is-new' : ''
      }`}
    >
      <div className="authority-thumb">
        {report.photoUrl ? <img src={report.photoUrl} alt="" loading="lazy" /> : <span />}
        <PriorityBadge priority={report.priority} showLabel={false} />
      </div>
      <div className="authority-row-main">
        <div className="authority-row-top">
          <span className="report-ref">{report.reference}</span>
          <StatusBadge status={report.status} />
          {report.priority === 'urgent' && <PriorityBadge priority="urgent" />}
        </div>
        <h3>{report.title}</h3>
        <p>{excerpt(report.description, 120)}</p>
        <div className="authority-row-meta">
          <span>{report.citizen?.name}</span>
          <span className="meta-sep">·</span>
          <span>
            <MapPin size={12} /> {report.location?.name}
          </span>
          <span className="meta-sep">·</span>
          <span>{timeAgo(report.createdAt, lang)}</span>
        </div>
      </div>
      <div className="authority-row-side">
        {report.department ? (
          <span className="dept-tag" style={{ '--dept': report.department.color }}>
            {report.department.shortName}
          </span>
        ) : (
          <span className="dept-tag unassigned">{t('authority.unassigned')}</span>
        )}
        {report.messageCount > 0 && (
          <span className="row-message-count">
            <MessageCircle size={13} /> {report.messageCount}
          </span>
        )}
        <ArrowUpRight size={17} className="row-arrow" />
      </div>
    </Link>
  );
}

export function ReportListItem({ report }) {
  const { t, lang } = useLanguage();
  return (
    <Link to={`/authority/reports/${report.id}`} className="report-list-item">
      <span className="report-list-ref">{report.reference}</span>
      <span className="report-list-main">
        <strong>{report.title}</strong>
        <span>
          {report.citizen?.name} · {timeAgo(report.createdAt, lang)}
        </span>
      </span>
      <StatusBadge status={report.status} />
    </Link>
  );
}
