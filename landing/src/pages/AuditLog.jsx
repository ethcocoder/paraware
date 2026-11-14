import { useEffect, useMemo, useState } from 'react';
import {
  ScrollText,
  Search,
  ShieldCheck,
  Download,
  CheckCircle2,
  UserRound,
  Filter,
  Clock3,
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import { formatDate, formatTime } from '../format';
import { EmptyState, PageLoader } from '../components/UI';
import { useDocumentTitle } from '../hooks';

function actionLabel(action = '') {
  return action
    .replace('.', ' · ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AuditLog() {
  const { t, lang } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  useDocumentTitle('Audit log');

  useEffect(() => {
    api('/audit')
      .then((data) => setLogs(data.audit))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (type !== 'all' && !log.action.startsWith(type)) return false;
      if (!term) return true;
      return (
        log.action.toLowerCase().includes(term) ||
        log.actor_name?.toLowerCase().includes(term) ||
        log.detail?.toLowerCase().includes(term) ||
        log.entity_id?.toLowerCase().includes(term)
      );
    });
  }, [logs, query, type]);

  function exportCsv() {
    const rows = [
      ['Time', 'Actor', 'Action', 'Entity', 'Details'],
      ...filtered.map((log) => [
        log.created_at,
        log.actor_name || 'System',
        log.action,
        `${log.entity_type}:${log.entity_id || ''}`,
        log.detail || '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paraware-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="authority-page audit-page">
      <header className="authority-page-head">
        <div>
          <span className="eyebrow">Accountability</span>
          <h1>{t('authority.auditTitle')}</h1>
          <p>{t('authority.auditSub')}</p>
        </div>
        <button type="button" className="button button-soft" onClick={exportCsv} disabled={!filtered.length}>
          <Download size={16} /> Export CSV
        </button>
      </header>

      <div className="audit-security-note">
        <span className="audit-security-icon"><ShieldCheck size={19} /></span>
        <span>
          <strong>Immutable administrative record</strong>
          Every acknowledgement, assignment, status change and announcement is recorded with the responsible staff member and timestamp.
        </span>
        <span className="audit-total">{logs.length} entries</span>
      </div>

      <div className="audit-toolbar">
        <div className="audit-type-filters">
          {[
            ['all', 'All actions'],
            ['report', 'Reports'],
            ['announcement', 'Announcements'],
            ['auth', 'Sign-ins'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={type === value ? 'active' : ''}
              onClick={() => setType(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search actions, staff or reports"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={t('authority.auditEmpty')}
          description="Administrative actions will appear here as staff use the workspace."
        />
      ) : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Details</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="audit-time">
                      <Clock3 size={13} />
                      <span>
                        <strong>{formatDate(log.created_at, lang)}</strong>
                        <small>{formatTime(log.created_at, lang)}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="audit-actor">
                      <span className="audit-actor-avatar">
                        <UserRound size={13} />
                      </span>
                      <span>
                        <strong>{log.actor_name || 'System'}</strong>
                        <small>{log.actor_role || 'system'}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="audit-action"><CheckCircle2 size={13} /> {actionLabel(log.action)}</span>
                  </td>
                  <td><span className="audit-detail">{log.detail || '—'}</span></td>
                  <td><span className="audit-entity">{log.entity_type} <small>{log.entity_id?.slice(0, 8)}</small></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="audit-footer-note">
        <Filter size={14} /> Showing {filtered.length} of {logs.length} audit entries
      </div>
    </div>
  );
}
