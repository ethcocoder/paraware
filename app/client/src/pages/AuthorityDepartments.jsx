import { useEffect, useState } from 'react';
import {
  Building2,
  Construction,
  Droplets,
  Trash2,
  Lightbulb,
  ShieldAlert,
  HeartPulse,
  Mail,
  ArrowRight,
  CheckCircle2,
  Clock3,
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import { PageLoader } from '../components/UI';
import { useDocumentTitle } from '../hooks';
import { Link } from 'react-router-dom';

const ICONS = {
  road: Construction,
  droplets: Droplets,
  trash: Trash2,
  lightbulb: Lightbulb,
  shield: ShieldAlert,
  heart: HeartPulse,
};

export default function AuthorityDepartments() {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  useDocumentTitle('Departments');

  useEffect(() => {
    api('/departments')
      .then((data) => setDepartments(data.departments))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const totalActive = departments.reduce((sum, d) => sum + (d.activeCount || 0), 0);
  const totalResolved = departments.reduce((sum, d) => sum + (d.resolvedCount || 0), 0);
  const totalReports = departments.reduce((sum, d) => sum + (d.reportCount || 0), 0);

  return (
    <div className="authority-page departments-page">
      <header className="authority-page-head">
        <div>
          <span className="eyebrow">Responsible teams</span>
          <h1>{t('authority.departmentsTitle')}</h1>
          <p>{t('authority.departmentsSub')}</p>
        </div>
        <Link to="/authority" className="button button-soft">
          <ArrowRight size={16} /> {t('authority.openQueue')}
        </Link>
      </header>

      <div className="department-summary-strip">
        <div>
          <Building2 size={20} />
          <span><strong>{departments.length}</strong> departments</span>
        </div>
        <div>
          <Clock3 size={20} />
          <span><strong>{totalActive}</strong> active reports</span>
        </div>
        <div>
          <CheckCircle2 size={20} />
          <span><strong>{totalResolved}</strong> resolved reports</span>
        </div>
        <span className="department-summary-note">{totalReports} reports in total across Woreda 04</span>
      </div>

      <div className="department-grid">
        {departments.map((department) => {
          const Icon = ICONS[department.icon] || Building2;
          const resolutionRate = department.reportCount
            ? Math.round((department.resolvedCount / department.reportCount) * 100)
            : 0;
          return (
            <article key={department.id} className="department-card">
              <div className="department-card-head">
                <span
                  className="department-card-icon"
                  style={{ background: `${department.color}18`, color: department.color }}
                >
                  <Icon size={22} />
                </span>
                <span className="department-status"><span className="online-dot" /> Active</span>
              </div>
              <h2>{department.name}</h2>
              <p>{department.description}</p>
              <div className="department-numbers">
                <div>
                  <strong>{department.activeCount || 0}</strong>
                  <span>{t('authority.activeReports')}</span>
                </div>
                <div>
                  <strong>{department.resolvedCount || 0}</strong>
                  <span>{t('authority.resolvedReports')}</span>
                </div>
                <div>
                  <strong>{department.reportCount || 0}</strong>
                  <span>{t('authority.totalReports')}</span>
                </div>
              </div>
              <div className="department-progress">
                <div className="department-progress-label">
                  <span>Resolution rate</span>
                  <strong>{resolutionRate}%</strong>
                </div>
                <span className="department-progress-bar">
                  <span style={{ width: `${resolutionRate}%`, background: department.color }} />
                </span>
              </div>
              <div className="department-card-foot">
                <a href={`mailto:${department.email}`}><Mail size={14} /> {department.email}</a>
                <Link to={`/authority?department=${department.id}`}>View reports <ArrowRight size={14} /></Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
