import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Sparkles,
  Send,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Clock3,
  Megaphone,
  Quote,
  Inbox,
  Building2,
  ChevronRight,
  Play,
} from 'lucide-react';
import { Brand } from '../components/Brand';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { CategoryPill, StatusBadge } from '../components/Badges';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { api } from '../api';
import { formatDate } from '../format';
import { useDocumentTitle } from '../hooks';

function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function Landing() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useDocumentTitle(null);

  useEffect(() => {
    api('/public/overview').then(setOverview).catch(() => {});
  }, []);

  const reportHref = user
    ? user.role === 'citizen'
      ? '/app/report'
      : '/authority'
    : '/login?next=/app/report';
  const signInHref = user
    ? user.role === 'citizen'
      ? '/app'
      : '/authority'
    : '/login';

  const stats = overview || {
    resolvedReports: 0,
    progressingReports: 0,
    departments: 0,
  };

  return (
    <div className="landing">
      <button
        className="hamburger"
        onClick={() => setMobileMenuOpen((v) => !v)}
        aria-label={t('nav.toggleMenu')}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="landing-nav" style={{ transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)' }}>
        <a href="#how-it-works">{t('nav.howItWorks')}</a>
        <a href="#for-authority">{t('nav.forWoreda')}</a>
        <a href="#announcements">{t('nav.announcements')}</a>
      </div>

      <div className="public-ribbon">
        <span className="ribbon-dot" />
        <span className="ribbon-copy">
          <strong>Paraware pilot is open in Woreda 04.</strong>
          <span>Report a problem in under a minute.</span>
        </span>
        <Link to={reportHref}>
          Try it now <ArrowRight size={14} />
        </Link>
      </div>

      <header className="public-header">
        <Link to="/" className="brand-link" aria-label="Paraware home">
          <Brand size={40} />
        </Link>
        <nav className="public-nav" aria-label="Main navigation">
          <a href="#how-it-works">{t('nav.howItWorks')}</a>
          <a href="#for-authority">{t('nav.forWoreda')}</a>
          <a href="#announcements">{t('nav.announcements')}</a>
        </nav>
        <div className="public-header-actions">
          <LanguageSwitcher />
          <Link to={signInHref} className="button button-ghost button-small">
            {t('nav.signIn')}
          </Link>
          <Link to={reportHref} className="button button-primary button-small">
            {t('action.reportProblem')} <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow-pill">
              <span className="eyebrow-dot" />
              {t('landing.eyebrow')}
            </span>
            <h1>
              <span>{t('landing.titleA')}</span>{' '}
              <span className="hero-emphasis">{t('landing.titleB')}</span>
              <br />
              <span className="hero-underline">{t('landing.titleC')}</span>
            </h1>
            <p className="hero-subtitle">{t('landing.subtitle')}</p>
            <div className="hero-actions">
              <Link to={reportHref} className="button button-primary button-large">
                <Camera size={20} />
                {t('action.reportProblem')}
                <ArrowRight size={18} className="button-tail" />
              </Link>
              <Link to="/login" className="button button-soft button-large">
                <Play size={16} fill="currentColor" />
                {t('login.demo')}
              </Link>
            </div>
            <p className="hero-trust">
              <ShieldCheck size={16} /> {t('landing.trust')}
            </p>
            <div className="hero-proof">
              <div className="proof-avatars" aria-hidden="true">
                <span>HT</span>
                <span>DB</span>
                <span>MA</span>
                <span className="proof-more">+</span>
              </div>
              <div>
                <strong>Residents of Woreda 04</strong>
                <span>are reporting, tracking and resolving problems together.</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Paraware report preview">
            <span className="hero-blob blob-a" aria-hidden="true" />
            <span className="hero-blob blob-b" aria-hidden="true" />
            <div className="hero-photo-card">
              <img src="/demo/addis.jpg" alt="A busy street in Addis Ababa" />
              <span className="photo-top-chip">
                <span className="live-dot" /> Woreda 04 · Live
              </span>
              <div className="hero-photo-overlay">
                <div className="overlay-avatar-row">
                  <span className="overlay-avatar">HT</span>
                  <span>
                    <strong>Hana reported a problem</strong>
                    <small>Kebele 08 · 2 minutes ago</small>
                  </span>
                </div>
                <div className="overlay-title">
                  Streetlight out on the lane behind the Kebele office
                </div>
                <div className="overlay-tags">
                  <span className="overlay-category">
                    <span className="mini-bulb" /> Lighting
                  </span>
                  <span className="overlay-status">
                    <CheckCircle2 size={13} /> Received
                  </span>
                </div>
              </div>
            </div>

            <div className="floating-card floating-track">
              <div className="floating-head">
                <span className="floating-icon">
                  <Clock3 size={16} />
                </span>
                <span>
                  <strong>Report acknowledged</strong>
                  <small>PW-1042 · 14 min response</small>
                </span>
                <CheckCircle2 size={17} className="floating-check" />
              </div>
              <div className="mini-progress">
                <span className="done" />
                <span className="done" />
                <span className="active" />
                <span />
                <span />
              </div>
              <div className="mini-progress-labels">
                <span>Reported</span>
                <span>Received</span>
                <span>Acknowledged</span>
                <span>In progress</span>
                <span>Resolved</span>
              </div>
            </div>

            <div className="floating-card floating-new">
              <span className="floating-new-icon">
                <Inbox size={18} />
              </span>
              <div>
                <strong>New report</strong>
                <span>Waste · Bole Michael</span>
              </div>
              <span className="unread-dot" />
            </div>

            <div className="floating-card floating-resolved">
              <span className="resolved-medal">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <strong>Problem resolved</strong>
                <span>Evidence added by Roads</span>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-band" aria-label="Paraware progress">
          <div className="stat-item">
            <strong>{stats.resolvedReports.toString().padStart(2, '0')}</strong>
            <span>{t('landing.statResolved')}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <strong>{stats.progressingReports.toString().padStart(2, '0')}</strong>
            <span>{t('landing.statProgressing')}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <strong>{stats.departments.toString().padStart(2, '0')}</strong>
            <span>{t('landing.statDepartments')}</span>
          </div>
          <div className="stat-side-note">
            <span className="pulse-dot" />
            <span>
              <strong>A direct line, not another meeting.</strong>
              <small>Every report is logged and time-stamped.</small>
            </span>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-intro">
            <span className="eyebrow">How Paraware works</span>
            <h2>{t('landing.howTitle')}</h2>
            <p>{t('landing.howSubtitle')}</p>
          </div>
          <div className="how-grid">
            {[
              { icon: Camera, title: t('landing.step1Title'), desc: t('landing.step1Desc'), tone: 'clay' },
              { icon: Sparkles, title: t('landing.step2Title'), desc: t('landing.step2Desc'), tone: 'green' },
              { icon: Building2, title: t('landing.step3Title'), desc: t('landing.step3Desc'), tone: 'blue' },
              { icon: CheckCircle2, title: t('landing.step4Title'), desc: t('landing.step4Desc'), tone: 'amber' },
            ].map(({ icon: Icon, title, desc, tone }, index) => (
              <article key={title} className={`how-card tone-${tone}`}>
                <div className="how-card-top">
                  <span className="how-icon">
                    <Icon size={22} />
                  </span>
                  <span className="how-number">0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
                {index < 3 && <span className="how-arrow"><ChevronRight size={18} /></span>}
              </article>
            ))}
          </div>
          <div className="how-note">
            <span className="how-note-icon"><Quote size={17} /></span>
            <p>
              <strong>Citizens report. The system organizes. Authorities respond. Problems get resolved.</strong>
              <span> — the idea behind Paraware</span>
            </p>
          </div>
        </section>

        <section className="authority-section" id="for-authority">
          <div className="authority-copy">
            <span className="eyebrow light">For the Woreda team</span>
            <h2>{t('landing.authorityTitle')}</h2>
            <p>{t('landing.authorityDesc')}</p>
            <ul className="authority-points">
              {[
                t('landing.authorityPoint1'),
                t('landing.authorityPoint2'),
                t('landing.authorityPoint3'),
              ].map((point) => (
                <li key={point}>
                  <CheckCircle2 size={18} /> {point}
                </li>
              ))}
            </ul>
            <Link to="/login?role=staff" className="button button-light button-large">
              {t('landing.authorityCta')} <ArrowRight size={18} />
            </Link>
            <span className="authority-app-note">
              <ShieldCheck size={14} /> Secure, role-based workspace · Installable desktop app
            </span>
          </div>

          <div className="authority-mock">
            <div className="mock-window">
              <div className="mock-sidebar">
                <Brand light size={27} compact />
                <span className="mock-nav active" />
                <span className="mock-nav" />
                <span className="mock-nav" />
                <span className="mock-nav short" />
                <div className="mock-sidebar-spacer" />
                <span className="mock-avatar" />
              </div>
              <div className="mock-content">
                <div className="mock-topbar">
                  <span>
                    <strong>Report inbox</strong>
                    <small>Woreda 04 · Addis Ababa</small>
                  </span>
                  <span className="mock-bell"><span /></span>
                </div>
                <div className="mock-stats">
                  <div>
                    <small>New today</small>
                    <strong>08</strong>
                    <span className="mock-up">+3</span>
                  </div>
                  <div>
                    <small>Awaiting</small>
                    <strong>12</strong>
                    <span className="mock-warn">4 urgent</span>
                  </div>
                  <div>
                    <small>In progress</small>
                    <strong>31</strong>
                    <span className="mock-ok">68%</span>
                  </div>
                </div>
                <div className="mock-list-head">
                  <span>Latest reports</span>
                  <span className="mock-filter">All <ChevronRight size={12} /></span>
                </div>
                <div className="mock-report active">
                  <span className="mock-thumb mock-thumb-1" />
                  <span className="mock-report-copy">
                    <span className="mock-ref">PW-1046 <i className="mock-urgent">Urgent</i></span>
                    <strong>Streetlight out on Kebele 08 lane</strong>
                    <small>Hana Tesfaye · 2 min ago</small>
                  </span>
                  <span className="mock-chevron"><ChevronRight size={15} /></span>
                </div>
                <div className="mock-report">
                  <span className="mock-thumb mock-thumb-2" />
                  <span className="mock-report-copy">
                    <span className="mock-ref">PW-1041</span>
                    <strong>Waste bins overflowing by school</strong>
                    <small>Dawit Bekele · 1 hr ago</small>
                  </span>
                  <span className="mock-chevron"><ChevronRight size={15} /></span>
                </div>
                <div className="mock-report">
                  <span className="mock-thumb mock-thumb-3" />
                  <span className="mock-report-copy">
                    <span className="mock-ref">PW-1038</span>
                    <strong>Water pipe leaking onto main road</strong>
                    <small>Meron Alemu · 3 hrs ago</small>
                  </span>
                  <span className="mock-chevron"><ChevronRight size={15} /></span>
                </div>
              </div>
            </div>
            <div className="mock-ai-chip">
              <Sparkles size={16} />
              <span>
                <strong>Paraware Assist</strong>
                <small>Suggested: Lighting · Urgent</small>
              </span>
            </div>
            <div className="mock-resolve-chip">
              <CheckCircle2 size={17} />
              <span>
                <strong>Resolved</strong>
                <small>Evidence uploaded</small>
              </span>
            </div>
          </div>
        </section>

        <section className="announcements-section" id="announcements">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Official updates</span>
              <h2>{t('landing.announcements')}</h2>
              <p>{t('landing.announcementsSub')}</p>
            </div>
            <Link to="/login" className="text-link">
              {t('action.viewAll')} <ArrowRight size={15} />
            </Link>
          </div>
          <div className="landing-announcements">
            {(overview?.announcements || []).map((item, index) => (
              <article key={item.id} className={`landing-announcement item-${index}`}>
                <div className="announcement-top">
                  <span className="announcement-category">
                    <Megaphone size={13} /> {item.category}
                  </span>
                  <span className="announcement-date">
                    {formatDate(item.publishedAt, lang, { month: 'short', year: undefined })}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.body.length > 165 ? `${item.body.slice(0, 162)}...` : item.body}</p>
                <span className="announcement-read">
                  Read notice <ArrowRight size={14} />
                </span>
              </article>
            ))}
            {!overview && (
              <>
                <div className="skeleton announcement-skeleton" />
                <div className="skeleton announcement-skeleton" />
                <div className="skeleton announcement-skeleton" />
              </>
            )}
          </div>
        </section>

        <section className="final-cta">
          <div className="final-cta-inner">
            <span className="final-mark"><Brand light size={44} compact /></span>
            <div>
              <span className="eyebrow light">Your Woreda, listening</span>
              <h2>See something? Say something.</h2>
              <p>One photo, a few words, and a clear record of what happens next.</p>
            </div>
            <Link to={reportHref} className="button button-gold button-large">
              {t('action.reportProblem')} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Brand size={38} />
            <p>
              A direct, accessible and accountable communication channel between
              residents and Woreda 04.
            </p>
            <span className="footer-scope"><MapPin size={14} /> Addis Ababa, Ethiopia</span>
          </div>
          <div className="footer-links">
            <div>
              <strong>Paraware</strong>
              <a href="#how-it-works">{t('nav.howItWorks')}</a>
              <a href="#for-authority">{t('nav.forWoreda')}</a>
              <a href="#announcements">{t('nav.announcements')}</a>
            </div>
            <div>
              <strong>Access</strong>
              <Link to="/login">{t('nav.signIn')}</Link>
              <Link to="/register">Create an account</Link>
              <Link to="/login?role=staff">Staff workspace</Link>
            </div>
            <div>
              <strong>Support</strong>
              <a href="tel:+251110000000">Call the Woreda</a>
              <a href="mailto:hello@paraware.et">hello@paraware.et</a>
              <span className="footer-hours">Mon–Fri · 8:30–17:00</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Paraware · Woreda 04 pilot</span>
          <span>{t('landing.footerNote')}</span>
          <span className="footer-badges">
            <span>{t('landing.privacy')}</span>
            <span>{t('landing.accessibility')}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
