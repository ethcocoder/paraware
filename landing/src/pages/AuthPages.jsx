import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UserRound,
  WifiOff,
} from 'lucide-react';
import { Brand, Avatar } from '../components/Brand';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { useDocumentTitle } from '../hooks';

function AuthStory() {
  const { t } = useLanguage();
  return (
    <aside className="auth-story">
      <div className="auth-story-top">
        <Link to="/" aria-label="Paraware home">
          <Brand light size={40} />
        </Link>
        <LanguageSwitcher light />
      </div>
      <div className="auth-story-copy">
        <span className="eyebrow light">{t('brand.scope')}</span>
        <h1>Every report is a step toward a Woreda that responds.</h1>
        <p>
          Paraware gives residents a direct line to the people responsible for
          their neighborhood — and gives the Woreda a clear way to act.
        </p>
      </div>
      <div className="auth-photo-wrap">
        <img src="/demo/addis.jpg" alt="A street scene in Addis Ababa" />
        <div className="auth-photo-tint" />
        <div className="auth-quote-card">
          <span className="quote-mark">“</span>
          <p>
            I reported the pothole on my way to work. By the next morning, the
            Woreda had already marked the area.
          </p>
          <div className="auth-quote-person">
            <Avatar name="Hana Tesfaye" size={32} tone={2} />
            <span>
              <strong>Hana T.</strong>
              <small>Kirkos · Woreda 04</small>
            </span>
            <span className="auth-verified"><CheckCircle2 size={14} /> Verified report</span>
          </div>
        </div>
        <div className="auth-floating-status">
          <span className="auth-floating-icon"><CheckCircle2 size={17} /></span>
          <span>
            <strong>Repair completed</strong>
            <small>Evidence uploaded · PW-1029</small>
          </span>
        </div>
      </div>
      <div className="auth-story-bottom">
        <span><ShieldCheck size={15} /> Secure citizen data</span>
        <span><WifiOff size={15} /> Works offline</span>
        <span><Headphones size={15} /> Help by phone</span>
      </div>
    </aside>
  );
}

function FormHead({ title, subtitle }) {
  return (
    <div className="auth-form-head">
      <Link to="/" className="auth-back">
        <ArrowLeft size={16} /> Back to Paraware
      </Link>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

export function Login() {
  const { t } = useLanguage();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useDocumentTitle('Sign in');

  const staffIntent = params.get('role') === 'staff';
  const next = params.get('next');

  useEffect(() => {
    if (user) {
      navigate(user.role === 'citizen' ? '/app' : '/authority', { replace: true });
    }
  }, [user, navigate]);

  function destination(signedInUser) {
    if (signedInUser.role === 'citizen') {
      return next && next.startsWith('/app') ? next : '/app';
    }
    return next && next.startsWith('/authority') ? next : '/authority';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const signedIn = await login(identifier, password);
      navigate(destination(signedIn), { replace: true });
    } catch (err) {
      setError(err.message === 'offline' ? t('common.offline') : err.message);
    } finally {
      setBusy(false);
    }
  }

  async function demo(role) {
    setError('');
    setBusy(true);
    try {
      const credentials =
        role === 'staff'
          ? ['selam@woreda04.gov.et', 'woreda04']
          : ['hana@example.com', 'paraware'];
      const signedIn = await login(...credentials);
      navigate(destination(signedIn), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthStory />
      <main className="auth-form-side">
        <div className="auth-form-top">
          <LanguageSwitcher />
        </div>
        <div className="auth-form-wrap">
          <FormHead title={t('login.title')} subtitle={t('login.subtitle')} />
          <div className="auth-role-tabs">
            <Link
              to="/login"
              className={!staffIntent ? 'active' : ''}
              aria-current={!staffIntent ? 'page' : undefined}
            >
              <UserRound size={16} /> Citizen
            </Link>
            <Link
              to="/login?role=staff"
              className={staffIntent ? 'active' : ''}
              aria-current={staffIntent ? 'page' : undefined}
            >
              <ShieldCheck size={16} /> Woreda staff
            </Link>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>{t('login.identifier')}</span>
              <span className="input-with-icon">
                <Smartphone size={18} />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder={t('login.identifierPlaceholder')}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                />
              </span>
            </label>
            <label className="field">
              <span className="field-label-row">
                <span>{t('login.password')}</span>
              </span>
              <span className="input-with-icon">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-tail-button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="button button-primary button-block button-large" disabled={busy}>
              {busy ? t('common.loading') : t('login.submit')}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
          <div className="auth-switch">
            {t('login.noAccount')} <Link to="/register">{t('login.create')}</Link>
          </div>

          <div className="demo-box">
            <div className="demo-box-head">
              <span className="demo-spark">✦</span>
              <div>
                <strong>{t('login.demo')}</strong>
                <p>{t('login.demoNote')}</p>
              </div>
            </div>
            <div className="demo-actions">
              <button type="button" className="demo-button" onClick={() => demo('citizen')} disabled={busy}>
                <span className="demo-avatar citizen">HT</span>
                <span>
                  <strong>{t('login.citizenDemo')}</strong>
                  <small>Hana Tesfaye · resident</small>
                </span>
                <ArrowRight size={16} />
              </button>
              <button type="button" className="demo-button" onClick={() => demo('staff')} disabled={busy}>
                <span className="demo-avatar staff">SB</span>
                <span>
                  <strong>{t('login.staffDemo')}</strong>
                  <small>Selam Bekele · administrator</small>
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <p className="auth-privacy">
            <LockKeyhole size={13} /> Your information is protected and only shared with authorized Woreda staff.
          </p>
        </div>
      </main>
    </div>
  );
}

export function Register() {
  const { t } = useLanguage();
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useDocumentTitle('Create account');

  useEffect(() => {
    if (user) {
      navigate(user.role === 'citizen' ? '/app' : '/authority', { replace: true });
    }
  }, [user, navigate]);

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const signedIn = await register({
        ...form,
        email: form.email || undefined,
      });
      navigate(signedIn.role === 'citizen' ? '/app' : '/authority', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthStory />
      <main className="auth-form-side">
        <div className="auth-form-top">
          <LanguageSwitcher />
        </div>
        <div className="auth-form-wrap register-form">
          <FormHead title={t('register.title')} subtitle={t('register.subtitle')} />
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>{t('register.name')}</span>
              <span className="input-with-icon">
                <UserRound size={18} />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder={t('register.namePlaceholder')}
                  value={form.name}
                  onChange={update('name')}
                  required
                />
              </span>
            </label>
            <div className="field-row">
              <label className="field">
                <span>{t('register.phone')}</span>
                <span className="input-with-icon">
                  <Smartphone size={18} />
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="0911 223 344"
                    value={form.phone}
                    onChange={update('phone')}
                    required
                  />
                </span>
              </label>
              <label className="field">
                <span>{t('register.email')} <small className="optional">{t('common.optional')}</small></span>
                <span className="input-with-icon">
                  <span className="at-symbol">@</span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={update('email')}
                  />
                </span>
              </label>
            </div>
            <label className="field">
              <span>{t('register.password')}</span>
              <span className="input-with-icon">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t('register.passwordHint')}
                  value={form.password}
                  onChange={update('password')}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="input-tail-button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="button button-primary button-block button-large" disabled={busy}>
              {busy ? t('common.loading') : t('register.submit')}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
          <p className="auth-terms">{t('register.terms')}</p>
          <div className="auth-switch">
            {t('register.haveAccount')} <Link to="/login">{t('register.signIn')}</Link>
          </div>
          <div className="register-help">
            <Smartphone size={19} />
            <div>
              <strong>No smartphone? No problem.</strong>
              <span>Call the Woreda office at 011 000 0000 and a staff member can record your report.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
