import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Building2,
  CheckCircle2,
  Clock3,
  Flame,
  Inbox,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { timeAgo, formatDate, formatTime } from '../format';
import { AuthorityReportRow } from '../components/ReportCards';
import { EmptyState, PageLoader } from '../components/UI';
import { useDocumentTitle } from '../hooks';

const NEW_STATUSES = ['submitted', 'received'];
const ACTIVE_STATUSES = ['acknowledged', 'assigned', 'under_review', 'in_progress'];
const RESOLVED_STATUSES = ['resolved', 'closed'];

function isMine(report, user) {
  return report.assignedTo?.id === user.id || report.department?.id === user.departmentId;
}

export default function AuthorityInbox({ mine = false }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(mine ? 'active' : 'all');
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  useDocumentTitle(mine ? 'My queue' : 'Report inbox');

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      try {
        const [reportData, statsData, deptData] = await Promise.all([
          api('/reports'),
          api('/stats'),
          api('/departments'),
        ]);
        setReports(reportData.reports);
        setStats(statsData.stats);
        setActivity(statsData.recentActivity);
        setDepartments(deptData.departments);
      } catch {
        if (!quiet) setReports([]);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => load({ quiet: true }), 35000);
    return () => window.clearInterval(timer);
  }, [load]);

  const scoped = useMemo(
    () => (mine ? reports.filter((report) => isMine(report, user)) : reports),
    [reports, mine, user]
  );

  const counts = useMemo(
    () => ({
      all: scoped.length,
      new: scoped.filter((r) => NEW_STATUSES.includes(r.status)).length,
      active: scoped.filter((r) => ACTIVE_STATUSES.includes(r.status)).length,
      resolved: scoped.filter((r) => RESOLVED_STATUSES.includes(r.status)).length,
      urgent: scoped.filter((r) => r.priority === 'urgent' && !RESOLVED_STATUSES.includes(r.status)).length,
    }),
    [scoped]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return scoped.filter((report) => {
      if (filter === 'new' && !NEW_STATUSES.includes(report.status)) return false;
      if (filter === 'active' && !ACTIVE_STATUSES.includes(report.status)) return false;
      if (filter === 'resolved' && !RESOLVED_STATUSES.includes(report.status)) return false;
      if (urgentOnly && report.priority !== 'urgent') return false;
      if (deptFilter && report.department?.id !== deptFilter) return false;
      if (!term) return true;
      return (
        report.title.toLowerCase().includes(term) ||
        report.reference.toLowerCase().includes(term) ||
        report.citizen?.name.toLowerCase().includes(term) ||
        report.location?.name?.toLowerCase().includes(term)
      );
    });
  }, [scoped, filter, query, deptFilter, urgentOnly]);

  const attention = useMemo(
    () =>
      scoped
        .filter((r) => NEW_STATUSES.includes(r.status))
        .sort((a, b) => (a.priority === 'urgent' ? -1 : 1))
        .slice(0, 3),
    [scoped]
  );

  if (loading) return <PageLoader />;

  const today = new Date();

  return (
    <div className="authority-page inbox-page">
      <header className="authority-page-head">
        <div>
          <span className="eyebrow">
            {formatDate(today, lang, { weekday: 'long', month: 'long', day: 'numeric', year: undefined })}
          </span>
          <h1>{mine ? t('nav.myQueue') : t('authority.inbox')}</h1>
          <p>{mine ? 'Reports assigned to you or your department.' : t('authority.inboxSub')}</p>
        </div>
        <div className="inbox-head-actions">
          <span className="live-status"><span className="pulse-dot" /> Live inbox</span>
          <Link to="/authority/announcements" className="button button-soft button-small">
            <BellRing size={15} /> Publish update
          </Link>
        </div>
      </header>

      <div className="authority-stats">
        <div className="authority-stat-card warm">
          <span className="authority-stat-icon"><Inbox size={20} /></span>
          <div>
            <span>{t('authority.newToday')}</span>
            <strong>{String(stats?.newToday ?? 0).padStart(2, '0')}</strong>
            <small><TrendingUp size={12} /> New citizen reports</small>
          </div>
        </div>
        <div className="authority-stat-card clay">
          <span className="authority-stat-icon"><Clock3 size={20} /></span>
          <div>
            <span>{t('authority.awaiting')}</span>
            <strong>{String(stats?.awaiting ?? 0).padStart(2, '0')}</strong>
            <small>{counts.urgent} urgent · needs a first response</small>
          </div>
        </div>
        <div className="authority-stat-card blue">
          <span className="authority-stat-icon"><UserRoundCheck size={20} /></span>
          <div>
            <span>{t('authority.active')}</span>
            <strong>{String(stats?.active ?? 0).padStart(2, '0')}</strong>
            <small>Across {departments.length} departments</small>
          </div>
        </div>
        <div className="authority-stat-card green">
          <span className="authority-stat-icon"><CheckCircle2 size={20} /></span>
          <div>
            <span>{t('authority.resolvedMonth')}</span>
            <strong>{String(stats?.resolvedMonth ?? 0).padStart(2, '0')}</strong>
            <small>{stats?.avgAcknowledgementHours ? `${stats.avgAcknowledgementHours}h avg. first response` : 'Resolved reports'}</small>
          </div>
        </div>
      </div>

      <div className="inbox-layout">
        <section className="inbox-panel">
          <div className="inbox-toolbar">
            <div className="inbox-tabs" role="tablist" aria-label="Report filters">
              {[
                ['all', 'All reports', counts.all],
                ['new', t('authority.filterNew'), counts.new],
                ['active', t('authority.filterActive'), counts.active],
                ['resolved', t('authority.filterResolved'), counts.resolved],
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  className={filter === value ? 'active' : ''}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
            <div className="inbox-tools">
              <label className="search-field authority-search">
                <Search size={16} />
                <input
                  type="search"
                  placeholder={t('authority.searchPlaceholder')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <select
                className="compact-select"
                value={deptFilter}
                onChange={(event) => setDeptFilter(event.target.value)}
                aria-label={t('authority.allDepartments')}
              >
                <option value="">{t('authority.allDepartments')}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.shortName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`filter-toggle ${urgentOnly ? 'active' : ''}`}
                onClick={() => setUrgentOnly((value) => !value)}
                title="Show urgent only"
              >
                <Flame size={16} /> {t('authority.filterUrgent')}
              </button>
            </div>
          </div>

          <div className="inbox-list-head">
            <span>{filtered.length} reports</span>
            <span className="inbox-list-sort">
              <SlidersHorizontal size={13} /> Priority and newest first
            </span>
          </div>

          <div className="authority-report-list">
            {filtered.length ? (
              filtered.map((report) => (
                <AuthorityReportRow key={report.id} report={report} />
              ))
            ) : (
              <EmptyState
                icon={Inbox}
                title={t('authority.noReports')}
                description="Try clearing the filters or searching for something else."
              />
            )}
          </div>
        </section>

        <aside className="inbox-aside">
          <div className="attention-card">
            <div className="aside-card-heading">
              <span className="attention-icon"><Flame size={17} /></span>
              <div>
                <h3>Needs attention</h3>
                <p>New reports waiting for an officer</p>
              </div>
            </div>
            <div className="attention-list">
              {attention.length === 0 && (
                <div className="attention-empty">
                  <CheckCircle2 size={18} /> Every new report has been acknowledged.
                </div>
              )}
              {attention.map((report) => (
                <Link key={report.id} to={`/authority/reports/${report.id}`} className="attention-item">
                  <span className={`attention-priority priority-${report.priority}`} />
                  <span className="attention-copy">
                    <strong>{report.title}</strong>
                    <small>{report.reference} · {timeAgo(report.createdAt, lang)}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          </div>

          <div className="aside-card-block">
            <div className="aside-card-heading">
              <span className="aside-icon"><Building2 size={17} /></span>
              <div>
                <h3>Department load</h3>
                <p>Active reports by team</p>
              </div>
            </div>
            <div className="dept-load-list">
              {departments.slice(0, 5).map((department) => {
                const max = Math.max(...departments.map((d) => d.activeCount || 0), 1);
                return (
                  <div key={department.id} className="dept-load-row">
                    <span className="dept-load-name">
                      <span className="department-dot" style={{ background: department.color }} />
                      {department.shortName}
                    </span>
                    <span className="dept-load-bar">
                      <span
                        style={{
                          width: `${Math.max(8, ((department.activeCount || 0) / max) * 100)}%`,
                          background: department.color,
                        }}
                      />
                    </span>
                    <span className="dept-load-count">{department.activeCount || 0}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="aside-card-block">
            <div className="aside-card-heading">
              <span className="aside-icon green"><Sparkles size={17} /></span>
              <div>
                <h3>Paraware Assist</h3>
                <p>How suggestions help</p>
              </div>
            </div>
            <p className="assist-copy">
              Every new report is analysed for a suggested department, category and urgency.
              Staff always make the final decision.
            </p>
            <div className="assist-stat-row">
              <span><strong>{stats?.acknowledgementRate || 0}%</strong> acknowledged</span>
              <span><strong>{stats?.avgAcknowledgementHours || '—'}h</strong> avg. response</span>
            </div>
          </div>

          <div className="aside-card-block activity-block">
            <div className="aside-card-heading">
              <span className="aside-icon clay"><Clock3 size={17} /></span>
              <div>
                <h3>{t('authority.recentActivity')}</h3>
                <p>Latest administrative actions</p>
              </div>
            </div>
            <div className="activity-mini-list">
              {activity.slice(0, 4).map((item) => (
                <div key={item.id} className="activity-mini-item">
                  <span className="activity-mini-dot" />
                  <div>
                    <strong>{item.detail}</strong>
                    <small>{item.actor || 'System'} · {formatTime(item.createdAt, lang)}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
