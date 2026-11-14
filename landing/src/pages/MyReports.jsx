import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import { CitizenReportCard } from '../components/ReportCards';
import { EmptyState, PageLoader, Segmented } from '../components/UI';
import { useDocumentTitle } from '../hooks';

export default function MyReports() {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  useDocumentTitle('My reports');

  useEffect(() => {
    api('/reports')
      .then((data) => setReports(data.reports))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(
    () => ({
      all: reports.length,
      active: reports.filter((r) => !['resolved', 'closed'].includes(r.status)).length,
      resolved: reports.filter((r) => ['resolved', 'closed'].includes(r.status)).length,
    }),
    [reports]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reports.filter((report) => {
      if (filter === 'active' && ['resolved', 'closed'].includes(report.status)) return false;
      if (filter === 'resolved' && !['resolved', 'closed'].includes(report.status)) return false;
      if (!term) return true;
      return (
        report.title.toLowerCase().includes(term) ||
        report.reference.toLowerCase().includes(term) ||
        report.description.toLowerCase().includes(term) ||
        report.location?.name?.toLowerCase().includes(term)
      );
    });
  }, [reports, filter, query]);

  if (loading) return <PageLoader />;

  return (
    <div className="page reports-page">
      <div className="page-head-with-action">
        <div>
          <span className="eyebrow">Your reports</span>
          <h1>{t('reports.title')}</h1>
          <p>{t('reports.subtitle')}</p>
        </div>
        <Link to="/app/report" className="button button-primary">
          <Plus size={18} /> {t('action.newReport')}
        </Link>
      </div>

      <div className="reports-summary">
        <div className="reports-summary-main">
          <span className="reports-summary-icon"><FileText size={21} /></span>
          <div>
            <strong>{counts.all}</strong>
            <span>Total reports</span>
          </div>
        </div>
        <div className="reports-summary-item">
          <Clock3 size={17} />
          <span><strong>{counts.active}</strong> {t('reports.active').toLowerCase()}</span>
        </div>
        <div className="reports-summary-item resolved">
          <CheckCircle2 size={17} />
          <span><strong>{counts.resolved}</strong> {t('home.resolved').toLowerCase()}</span>
        </div>
        <span className="reports-summary-note">Every report is kept for your records.</span>
      </div>

      <div className="reports-toolbar">
        <Segmented
          value={filter}
          onChange={setFilter}
          ariaLabel={t('nav.reports')}
          options={[
            { value: 'all', label: t('reports.all'), count: counts.all },
            { value: 'active', label: t('reports.active'), count: counts.active },
            { value: 'resolved', label: t('reports.resolved'), count: counts.resolved },
          ]}
        />
        <label className="search-field">
          <Search size={17} />
          <input
            type="search"
            placeholder={t('reports.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <SlidersHorizontal size={15} className="search-tail" />
        </label>
      </div>

      {filtered.length ? (
        <div className="reports-grid">
          {filtered.map((report) => (
            <CitizenReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={query ? 'No reports match your search' : t('reports.empty')}
          description={query ? 'Try a different word or clear the search.' : t('reports.emptyDesc')}
          action={
            !query && (
              <Link to="/app/report" className="button button-primary">
                <Camera size={17} /> {t('action.reportProblem')}
              </Link>
            )
          }
        />
      )}

      <div className="reports-help-strip">
        <span>
          <strong>Need to add information to a report?</strong>
          Open the report and reply in the conversation with the Woreda.
        </span>
        <Link to="/app/announcements" className="text-link">
          Read announcements <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
