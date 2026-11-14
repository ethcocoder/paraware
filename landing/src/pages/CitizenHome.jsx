import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  FileText,
  Megaphone,
  Plus,
  ShieldCheck,
  Sparkles,
  WifiOff,
  BellRing,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { greetingKey, formatDate } from '../format';
import { CitizenReportCard } from '../components/ReportCards';
import { PageLoader, EmptyState } from '../components/UI';
import { useDocumentTitle, useOnlineStatus } from '../hooks';

export default function CitizenHome() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const online = useOnlineStatus();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useDocumentTitle('Home');

  useEffect(() => {
    api('/citizen/home')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const reports = data?.reports || [];
  const active = reports.filter((report) => !['resolved', 'closed'].includes(report.status));
  const recent = reports.slice(0, 3);
  const announcements = data?.announcements || [];
  const firstName = user.name.split(' ')[0];

  return (
    <div className="page citizen-home-page">
      <header className="home-greeting">
        <div>
          <span className="eyebrow">{t('brand.scope')}</span>
          <h1>
            {t(greetingKey())}, <em>{firstName}.</em>
          </h1>
          <p>{t('home.subtitle')}</p>
        </div>
        <Link to="/app/report" className="button button-primary home-report-button">
          <Plus size={18} /> {t('action.newReport')}
        </Link>
      </header>

      <section className="quick-report">
        <div className="quick-report-copy">
          <span className="quick-kicker">
            <Sparkles size={14} /> {t('home.newReportTitle')}
          </span>
          <h2>Something not right in your neighborhood?</h2>
          <p>
            Take a clear photo, tell us what you see, and send it directly to
            Woreda 04. It takes less than a minute.
          </p>
          <Link to="/app/report" className="button button-gold button-large">
            <Camera size={19} /> {t('action.reportProblem')} <ArrowRight size={17} />
          </Link>
          <span className="quick-note">
            <ShieldCheck size={14} /> Your report is private and time-stamped.
          </span>
        </div>
        <div className="quick-report-visual" aria-hidden="true">
          <span className="quick-orbit orbit-one" />
          <span className="quick-orbit orbit-two" />
          <div className="quick-report-card">
            <div className="quick-card-head">
              <span className="quick-card-icon"><Camera size={17} /></span>
              <span>
                <strong>New report</strong>
                <small>Woreda 04</small>
              </span>
              <span className="quick-progress">1 of 3</span>
            </div>
            <div className="quick-photo">
              <img src="/demo/pothole2.jpg" alt="" />
              <span className="quick-photo-tag"><CheckCircle2 size={13} /> Photo added</span>
            </div>
            <div className="quick-card-lines">
              <span className="line-long" />
              <span className="line-short" />
            </div>
            <div className="quick-card-footer">
              <span className="quick-location">Kirkos · Woreda 04</span>
              <span className="quick-send">Send <ArrowRight size={13} /></span>
            </div>
          </div>
          <div className="quick-float quick-float-one">
            <span className="quick-float-icon"><CheckCircle2 size={15} /></span>
            <span>
              <strong>Received</strong>
              <small>by Woreda 04</small>
            </span>
          </div>
          <div className="quick-float quick-float-two">
            <span className="quick-float-icon amber"><BellRing size={15} /></span>
            <span>
              <strong>Stay updated</strong>
              <small>at every step</small>
            </span>
          </div>
        </div>
      </section>

      <div className="home-stat-row">
        <div className="home-stat">
          <span className="home-stat-icon green"><Clock3 size={18} /></span>
          <div>
            <strong>{active.length}</strong>
            <span>{t('home.active')}</span>
          </div>
        </div>
        <div className="home-stat">
          <span className="home-stat-icon blue"><CheckCircle2 size={18} /></span>
          <div>
            <strong>{data?.stats.resolved || 0}</strong>
            <span>{t('home.resolved')}</span>
          </div>
        </div>
        <div className="home-stat">
          <span className="home-stat-icon clay"><FileText size={18} /></span>
          <div>
            <strong>{reports.length}</strong>
            <span>Total reports</span>
          </div>
        </div>
        <div className={`home-stat connection-stat ${online ? 'online' : 'offline'}`}>
          <span className="home-stat-icon"><WifiOff size={18} /></span>
          <div>
            <strong>{online ? 'Connected' : 'Offline'}</strong>
            <span>{online ? 'Drafts sync automatically' : 'Your drafts are safe'}</span>
          </div>
        </div>
      </div>

      <div className="home-columns">
        <section className="home-main-column">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">{t('home.recent')}</span>
              <h2>Your reports</h2>
            </div>
            <Link to="/app/reports" className="text-link">
              {t('action.viewAll')} <ArrowRight size={15} />
            </Link>
          </div>
          {recent.length ? (
            <div className="report-card-list">
              {recent.map((report) => (
                <CitizenReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title={t('home.noReports')}
              description={t('home.noReportsDesc')}
              action={
                <Link to="/app/report" className="button button-primary">
                  <Camera size={17} /> {t('action.reportProblem')}
                </Link>
              }
            />
          )}
        </section>

        <aside className="home-aside">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">{t('home.officeUpdates')}</span>
              <h2>{t('nav.announcements')}</h2>
            </div>
            <Link to="/app/announcements" className="icon-link" aria-label="View announcements">
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="home-announcement-list">
            {announcements.slice(0, 3).map((announcement) => (
              <Link
                to="/app/announcements"
                key={announcement.id}
                className="home-announcement"
              >
                <span className="announcement-icon"><Megaphone size={16} /></span>
                <span>
                  <span className="announcement-mini-meta">
                    {announcement.category} · {formatDate(announcement.publishedAt, lang, { month: 'short', year: undefined })}
                  </span>
                  <strong>{announcement.title}</strong>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>

          <div className="offline-ready-card">
            <span className="offline-ready-icon"><WifiOff size={20} /></span>
            <div>
              <strong>{t('home.offlineReady')}</strong>
              <p>{t('home.offlineReadyDesc')}</p>
            </div>
          </div>
          <div className="notify-card">
            <span className="notify-card-icon"><BellRing size={20} /></span>
            <div>
              <strong>{t('home.notifyTitle')}</strong>
              <p>{t('home.notifyDesc')}</p>
            </div>
            <span className="notify-toggle" aria-hidden="true"><span /></span>
          </div>
        </aside>
      </div>
    </div>
  );
}
