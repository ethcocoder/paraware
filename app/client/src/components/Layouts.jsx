import { useEffect, useRef, useState } from 'react';
import {
  NavLink,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  House,
  FileText,
  Megaphone,
  UserRound,
  Plus,
  LogOut,
  Menu,
  X,
  Inbox,
  ShieldCheck,
  Building2,
  ScrollText,
  ChevronDown,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { Brand, Avatar } from './Brand';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { useOnlineStatus } from '../hooks';
import { OfflineBanner } from './UI';

function UserMenu({ align = 'right' }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className={`user-menu ${align}`} ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Avatar name={user?.name} size={34} tone={2} />
        <span className="user-menu-name">
          <strong>{user?.name}</strong>
          <small>{user?.role === 'citizen' ? t('common.citizen') : user?.role}</small>
        </span>
        <ChevronDown size={14} className={open ? 'rotate' : ''} />
      </button>
      {open && (
        <div className="user-dropdown">
          <Link
            to={user?.role === 'citizen' ? '/app/profile' : '/authority'}
            onClick={() => setOpen(false)}
          >
            <UserRound size={16} /> {t('nav.profile')}
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={16} /> {t('action.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

export function CitizenLayout() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const online = useOnlineStatus();
  const location = useLocation();
  const newReport = location.pathname.endsWith('/report');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="citizen-shell">
      <OfflineBanner online={online} />
      <header className="citizen-header">
        <div className="citizen-header-inner">
          <Link to="/app" className="brand-link" aria-label="Paraware home">
            <Brand size={36} />
          </Link>
          <nav className="citizen-nav" aria-label="Main navigation">
            <NavLink to="/app" end>
              <House size={16} /> {t('nav.home')}
            </NavLink>
            <NavLink to="/app/reports">
              <FileText size={16} /> {t('nav.reports')}
            </NavLink>
            <NavLink to="/app/announcements">
              <Megaphone size={16} /> {t('nav.announcements')}
            </NavLink>
          </nav>
          <div className="citizen-header-actions">
            <div className="woreda-chip">
              <span className="woreda-dot" />
              {t('brand.scope')}
            </div>
            <LanguageSwitcher />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="citizen-main">
        <Outlet />
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/app" end>
          <House size={21} />
          <span>{t('nav.home')}</span>
        </NavLink>
        <NavLink to="/app/reports">
          <FileText size={21} />
          <span>{t('nav.reports')}</span>
        </NavLink>
        <NavLink
          to="/app/report"
          className={`report-fab ${newReport ? 'active' : ''}`}
          aria-label={t('action.reportProblem')}
        >
          <Plus size={27} strokeWidth={2.4} />
        </NavLink>
        <NavLink to="/app/announcements">
          <Megaphone size={21} />
          <span>{t('nav.announcements')}</span>
        </NavLink>
        <NavLink to="/app/profile">
          <UserRound size={21} />
          <span>{t('nav.profile')}</span>
        </NavLink>
      </nav>

      <div className={`connection-chip ${online ? 'online' : 'offline'}`}>
        {!online ? <WifiOff size={14} /> : <span className="online-dot" />}
        {online ? 'Online' : 'Offline'}
      </div>
    </div>
  );
}

const authorityNav = [
  { to: '/authority', label: 'nav.inbox', icon: Inbox, end: true },
  { to: '/authority/queue', label: 'nav.myQueue', icon: Sparkles },
  { to: '/authority/departments', label: 'nav.departments', icon: Building2 },
  { to: '/authority/announcements', label: 'nav.authorityAnnouncements', icon: Megaphone },
  { to: '/authority/audit', label: 'nav.audit', icon: ScrollText },
];

export function AuthorityLayout() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="authority-shell">
      <aside className={`authority-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="authority-sidebar-top">
          <Link to="/authority" aria-label="Paraware authority home">
            <Brand light size={38} />
          </Link>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label={t('action.close')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <ShieldCheck size={15} />
          {t('nav.workspace')}
        </div>
        <nav className="authority-nav" aria-label="Authority navigation">
          {authorityNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="sidebar-note-icon">
            <ShieldCheck size={17} />
          </span>
          <div>
            <strong>Official use only</strong>
            <p>Every administrative action is recorded in the audit log.</p>
          </div>
        </div>
        <div className="sidebar-user">
          <Avatar name={user?.name} size={38} tone={0} />
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.departmentName || 'Woreda administration'}</span>
          </div>
          <button
            type="button"
            className="icon-button sidebar-logout"
            aria-label={t('action.signOut')}
            title={t('action.signOut')}
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label={t('action.close')}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="authority-body">
        <header className="authority-topbar">
          <button
            type="button"
            className="icon-button mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="topbar-context">
            <span className="eyebrow">Woreda 04 · Addis Ababa</span>
            <strong>{t('authority.workspace')}</strong>
          </div>
          <div className="authority-top-actions">
            <div className="topbar-date">
              <span className="online-dot" />
              Connected
            </div>
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="authority-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
