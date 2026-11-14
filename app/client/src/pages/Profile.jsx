import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  Check,
  Globe2,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../auth';
import { useLanguage, LANGUAGES } from '../i18n';
import { api } from '../api';
import { formatDate } from '../format';
import { useDocumentTitle } from '../hooks';
import { useToast } from '../toast';

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const { push } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('paraware.prefs') || '{"push":true,"sms":false}');
    } catch {
      return { push: true, sms: false };
    }
  });
  useDocumentTitle('Profile');

  useEffect(() => {
    localStorage.setItem('paraware.prefs', JSON.stringify(prefs));
  }, [prefs]);

  async function changeLanguage(next) {
    setLang(next);
    try {
      const data = await api('/me', { method: 'PATCH', body: { language: next } });
      updateUser(data.user);
    } catch {
      // Language remains saved locally even if the network is unavailable.
    }
  }

  async function saveName(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await api('/me', { method: 'PATCH', body: { name, language: lang } });
      updateUser(data.user);
      push(t('profile.saved'));
    } catch (err) {
      push(err.message, 'info');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page profile-page">
      <header className="profile-hero">
        <span className="profile-avatar-large">
          {user?.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </span>
        <div>
          <span className="eyebrow">{t('common.citizen')} · Woreda 04</span>
          <h1>{user?.name}</h1>
          <p>{user?.phone} {user?.email ? `· ${user.email}` : ''}</p>
        </div>
        <span className="profile-verified"><ShieldCheck size={15} /> Verified account</span>
      </header>

      <div className="profile-grid">
        <div className="profile-main">
          <section className="profile-card">
            <div className="profile-card-head">
              <span className="profile-card-icon"><UserRound size={18} /></span>
              <div>
                <h2>{t('profile.account')}</h2>
                <p>Keep your contact information up to date.</p>
              </div>
            </div>
            <form onSubmit={saveName} className="profile-form">
              <label className="field">
                <span>Full name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Phone number</span>
                  <input value={user?.phone || ''} disabled />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input value={user?.email || 'Not added'} disabled />
                </label>
              </div>
              <div className="profile-form-actions">
                <span>Member since {formatDate(user?.createdAt, lang, { month: 'long' })}</span>
                <button type="submit" className="button button-primary button-small" disabled={busy}>
                  {busy ? t('action.saving') : t('action.save')}
                </button>
              </div>
            </form>
          </section>

          <section className="profile-card">
            <div className="profile-card-head">
              <span className="profile-card-icon green"><Globe2 size={18} /></span>
              <div>
                <h2>{t('profile.language')}</h2>
                <p>{t('profile.languageHint')}</p>
              </div>
            </div>
            <div className="language-options">
              {LANGUAGES.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  className={`language-option ${lang === language.id ? 'selected' : ''}`}
                  onClick={() => changeLanguage(language.id)}
                >
                  <span className="language-code">{language.short}</span>
                  <span>{language.label}</span>
                  {lang === language.id && <Check size={17} />}
                </button>
              ))}
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card-head">
              <span className="profile-card-icon amber"><BellRing size={18} /></span>
              <div>
                <h2>Notifications</h2>
                <p>Choose how Woreda 04 can keep you updated.</p>
              </div>
            </div>
            <div className="preference-list">
              <label className="preference-row">
                <span className="preference-icon"><Smartphone size={17} /></span>
                <span>
                  <strong>In-app notifications</strong>
                  <small>Status changes, messages and official announcements</small>
                </span>
                <input
                  type="checkbox"
                  checked={prefs.push}
                  onChange={(event) => setPrefs((p) => ({ ...p, push: event.target.checked }))}
                />
                <span className="toggle" />
              </label>
              <label className="preference-row">
                <span className="preference-icon"><BellRing size={17} /></span>
                <span>
                  <strong>SMS fallback</strong>
                  <small>Important updates by text if you are offline</small>
                </span>
                <input
                  type="checkbox"
                  checked={prefs.sms}
                  onChange={(event) => setPrefs((p) => ({ ...p, sms: event.target.checked }))}
                />
                <span className="toggle" />
              </label>
            </div>
          </section>
        </div>

        <aside className="profile-aside">
          <div className="profile-privacy-card">
            <span className="profile-card-icon"><LockKeyhole size={18} /></span>
            <h3>Your privacy</h3>
            <p>{t('profile.privacy')}</p>
            <ul>
              <li><Check size={14} /> Encrypted connection</li>
              <li><Check size={14} /> Role-based staff access</li>
              <li><Check size={14} /> Full audit trail</li>
            </ul>
          </div>
          <div className="profile-about-card">
            <h3>{t('profile.about')}</h3>
            <p>{t('profile.aboutDesc')}</p>
            <span>Paraware v0.1 · Woreda 04 pilot</span>
          </div>
          <button
            type="button"
            className="button button-danger-ghost button-block"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={17} /> {t('action.signOut')}
          </button>
        </aside>
      </div>
    </div>
  );
}
