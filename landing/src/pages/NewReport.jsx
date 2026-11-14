import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  LocateFixed,
  LockKeyhole,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { CATEGORIES } from '../constants';
import { useDocumentTitle, useOnlineStatus } from '../hooks';
import { useToast } from '../toast';
import { compressImage } from '../image';

const DRAFT_KEY = 'paraware.reportDraft';

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function NewReport() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { push } = useToast();
  const fileRef = useRef(null);
  const mounted = useRef(false);
  useDocumentTitle('Report a problem');

  const initialDraft = loadDraft();
  const [step, setStep] = useState(() =>
    initialDraft?.description ? 2 : 1
  );
  const [photo, setPhoto] = useState(initialDraft?.photo || null);
  const [photoName, setPhotoName] = useState(initialDraft?.photoName || '');
  const [form, setForm] = useState(
    initialDraft?.form || {
      description: '',
      category: '',
      locationName: '',
      latitude: null,
      longitude: null,
    }
  );
  const [restored, setRestored] = useState(Boolean(initialDraft));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [created, setCreated] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    if (created) return undefined;
    const timer = window.setTimeout(() => {
      if (!photo && !form.description && !form.locationName) return;
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ photo, photoName, form, savedAt: new Date().toISOString() })
        );
        setDraftSaved(true);
        window.setTimeout(() => setDraftSaved(false), 1800);
      } catch {
        // The photo may exceed the local storage limit; the form text is still safe in memory.
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [photo, photoName, form, created]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setPhotoLoading(true);
    try {
      const dataUrl = await compressImage(file);
      if (!mounted.current) return;
      setPhoto(dataUrl);
      setPhotoName(file.name);
      setRestored(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoLoading(false);
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setLocationError('Location is not available on this device.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm((current) => ({
          ...current,
          latitude,
          longitude,
          locationName: current.locationName || 'My current location, Woreda 04',
        }));
        setLocating(false);
      },
      () => {
        setLocationError(t('report.locationDenied'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setPhoto(null);
    setPhotoName('');
    setForm({ description: '', category: '', locationName: '', latitude: null, longitude: null });
    setStep(1);
    setRestored(false);
    setError('');
  }

  function goNext() {
    setError('');
    if (step === 1) {
      if (!photo) {
        setError(t('report.photoError'));
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (form.description.trim().length < 10) {
        setError(t('report.descriptionError'));
        return;
      }
      setStep(3);
    }
  }

  async function submit() {
    setError('');
    if (!photo) {
      setStep(1);
      setError(t('report.photoError'));
      return;
    }
    if (!online) {
      setError(t('report.submitOffline'));
      push(t('report.submitOffline'), 'info');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/reports', {
        method: 'POST',
        body: {
          description: form.description,
          category: form.category || undefined,
          photoDataUrl: photo,
          location: {
            name: form.locationName,
            latitude: form.latitude,
            longitude: form.longitude,
          },
          language: lang,
        },
      });
      localStorage.removeItem(DRAFT_KEY);
      setCreated(result.report);
      push('Your report has been sent to Woreda 04.');
    } catch (err) {
      if (err.code === 'offline') {
        setError(t('report.submitOffline'));
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="page success-page">
        <div className="success-card">
          <div className="success-burst" aria-hidden="true">
            <span /><span /><span /><span /><span /><span />
          </div>
          <span className="success-icon"><Check size={34} /></span>
          <span className="eyebrow">Report {created.reference}</span>
          <h1>{t('report.successTitle')}</h1>
          <p>{t('report.successDesc')}</p>
          <div className="success-reference">
            <span>Reference number</span>
            <strong>{created.reference}</strong>
          </div>
          <div className="success-steps">
            <span className="done"><CheckCircle2 size={16} /> Submitted</span>
            <span className="current"><span className="pulse-dot" /> Received</span>
            <span><span className="step-ring" /> Acknowledged</span>
          </div>
          <div className="success-actions">
            <button
              type="button"
              className="button button-primary button-large"
              onClick={() => navigate(`/app/reports/${created.id}`)}
            >
              {t('report.viewReport')} <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="button button-soft button-large"
              onClick={() => {
                setCreated(null);
                setPhoto(null);
                setPhotoName('');
                setForm({ description: '', category: '', locationName: '', latitude: null, longitude: null });
                setStep(1);
                setRestored(false);
              }}
            >
              {t('report.another')}
            </button>
          </div>
          <span className="success-note">
            <ShieldCheck size={14} /> You will receive a notification when an officer acknowledges it.
          </span>
        </div>
      </div>
    );
  }

  const canContinue = step === 1 ? Boolean(photo) : form.description.trim().length >= 10;

  return (
    <div className="page report-page">
      <div className="report-page-head">
        <Link to="/app" className="back-link"><ArrowLeft size={16} /> {t('nav.home')}</Link>
        <span className="eyebrow">New report · Woreda 04</span>
        <h1>{t('report.title')}</h1>
        <p>{t('report.subtitle')}</p>
      </div>

      <div className="report-stepper">
        {[
          { n: 1, label: 'Photograph' },
          { n: 2, label: 'Details' },
          { n: 3, label: 'Review' },
        ].map((item, index) => (
          <div
            key={item.n}
            className={`report-step-item ${step === item.n ? 'current' : ''} ${
              step > item.n ? 'complete' : ''
            }`}
          >
            <span className="report-step-node">
              {step > item.n ? <Check size={15} /> : item.n}
            </span>
            <span>{item.label}</span>
            {index < 2 && <span className="report-step-line" />}
          </div>
        ))}
        <span className={`draft-indicator ${draftSaved ? 'show' : ''}`}>
          <CheckCircle2 size={13} /> {t('report.draftSaved')}
        </span>
      </div>

      {restored && (
        <div className="draft-banner">
          <span className="draft-banner-icon"><RotateCcw size={16} /></span>
          <span>
            <strong>We restored your unfinished draft.</strong>
            <small>It was saved automatically on this device.</small>
          </span>
          <button type="button" className="text-button" onClick={clearDraft}>
            Start fresh <Trash2 size={13} />
          </button>
        </div>
      )}

      {!online && (
        <div className="inline-offline">
          <WifiOff size={16} />
          <span>{t('report.offlineNotice')}</span>
        </div>
      )}

      <div className="report-flow">
        <div className="report-form-card">
          {step === 1 && (
            <div className="report-step-content">
              <div className="step-heading">
                <span className="step-number">01</span>
                <div>
                  <h2>{t('report.photoTitle')}</h2>
                  <p>{t('report.photoHint')}</p>
                </div>
              </div>

              {photo ? (
                <div className="photo-preview-wrap">
                  <img src={photo} alt="Your report" className="photo-preview" />
                  <div className="photo-preview-actions">
                    <button
                      type="button"
                      className="button button-light button-small"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Camera size={15} /> {t('report.photoReplace')}
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoName('');
                      }}
                      aria-label="Remove photo"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <span className="photo-file-name">{photoName}</span>
                </div>
              ) : (
                <button
                  type="button"
                  className={`photo-dropzone ${photoLoading ? 'loading' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  disabled={photoLoading}
                >
                  <span className="photo-drop-icon">
                    {photoLoading ? <span className="loader-ring small" /> : <ImagePlus size={30} />}
                  </span>
                  <strong>{photoLoading ? 'Preparing your photo…' : t('report.photoButton')}</strong>
                  <span>JPEG, PNG or WebP · Take a clear, well-lit photo</span>
                  <span className="photo-drop-button">
                    <Camera size={16} /> Open camera or gallery
                  </span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handlePhoto}
              />
              <div className="photo-privacy">
                <LockKeyhole size={15} />
                <span>{t('report.photoPrivacy')}</span>
              </div>
              {error && <div className="form-error" role="alert">{error}</div>}
            </div>
          )}

          {step === 2 && (
            <div className="report-step-content">
              <div className="step-heading">
                <span className="step-number">02</span>
                <div>
                  <h2>{t('report.descriptionTitle')}</h2>
                  <p>{t('report.descriptionHint')}</p>
                </div>
              </div>

              <label className="field">
                <span className="field-label-row">
                  <span>What is happening?</span>
                  <span className="char-count">
                    {form.description.length} / 3000
                  </span>
                </span>
                <textarea
                  className="report-textarea"
                  rows={7}
                  maxLength={3000}
                  placeholder={t('report.descriptionPlaceholder')}
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  autoFocus
                />
              </label>

              <div className="field-group">
                <div className="field-group-head">
                  <span>{t('report.categoryTitle')}</span>
                  <small>{t('common.optional')}</small>
                </div>
                <p className="field-help">{t('report.categoryHint')}</p>
                <div className="category-grid">
                  {CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const selected = form.category === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={`category-choice ${selected ? 'selected' : ''}`}
                        onClick={() => update('category', selected ? '' : category.id)}
                      >
                        <Icon size={18} style={{ color: category.color }} />
                        <span>{t(`category.${category.id}`)}</span>
                        {selected && <Check size={15} className="category-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="location-block">
                <div className="field-group-head">
                  <span>{t('report.locationTitle')}</span>
                  <small>{t('common.optional')}</small>
                </div>
                <p className="field-help">{t('report.locationHint')}</p>
                <div className="location-row">
                  <label className="input-with-icon">
                    <MapPin size={18} />
                    <input
                      type="text"
                      placeholder={t('report.locationPlaceholder')}
                      value={form.locationName}
                      onChange={(event) => update('locationName', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className={`button button-soft location-button ${locating ? 'loading' : ''}`}
                    onClick={useLocation}
                    disabled={locating}
                  >
                    {locating ? <span className="loader-ring small" /> : <LocateFixed size={17} />}
                    {locating ? 'Locating…' : t('action.useLocation')}
                  </button>
                </div>
                {form.latitude !== null && (
                  <div className="location-attached">
                    <span className="location-attached-icon"><MapPin size={14} /></span>
                    <span>
                      <strong>{t('report.locationAttached')}</strong>
                      <small>
                        {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="icon-button small"
                      aria-label="Remove location"
                      onClick={() => {
                        update('latitude', null);
                        update('longitude', null);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {locationError && <div className="inline-note">{locationError}</div>}
              </div>
              {error && <div className="form-error" role="alert">{error}</div>}
            </div>
          )}

          {step === 3 && (
            <div className="report-step-content">
              <div className="step-heading">
                <span className="step-number">03</span>
                <div>
                  <h2>{t('report.reviewTitle')}</h2>
                  <p>{t('report.reviewHint')}</p>
                </div>
              </div>
              <div className="review-card">
                <div className="review-photo">
                  {photo && <img src={photo} alt="Report attachment" />}
                  <span className="review-photo-badge">Photo attached</span>
                </div>
                <div className="review-body">
                  <span className="review-eyebrow">Citizen report</span>
                  <h3>
                    {form.description.split(/(?<=[.!?])\s/)[0]?.slice(0, 90) ||
                      'Public problem report'}
                  </h3>
                  <p>{form.description}</p>
                  <div className="review-tags">
                    {form.category ? (
                      <span className="review-tag">
                        {t(`category.${form.category}`)}
                      </span>
                    ) : (
                      <span className="review-tag muted-tag">Category will be suggested</span>
                    )}
                    <span className="review-tag">
                      <MapPin size={12} /> {form.locationName || 'Location not provided'}
                    </span>
                  </div>
                  <div className="review-person">
                    <span className="review-avatar">{user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>
                    <span>
                      <strong>{user.name}</strong>
                      <small>{user.phone}</small>
                    </span>
                    <span className="review-verified"><ShieldCheck size={13} /> Verified account</span>
                  </div>
                </div>
              </div>
              <div className="review-notice">
                <ShieldCheck size={18} />
                <p>
                  <strong>Your original description is preserved.</strong>
                  <span>
                    Paraware Assist may suggest a category or urgency, but an authorized Woreda officer always makes the final decision.
                  </span>
                </p>
              </div>
              {error && <div className="form-error" role="alert">{error}</div>}
            </div>
          )}

          <div className="report-form-footer">
            {step > 1 ? (
              <button type="button" className="button button-ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={17} /> {t('action.back')}
              </button>
            ) : (
              <span className="footer-hint">Step 1 of 3</span>
            )}
            {step < 3 ? (
              <button
                type="button"
                className="button button-primary"
                onClick={goNext}
                disabled={!canContinue}
              >
                {t('action.continue')} <ArrowRight size={17} />
              </button>
            ) : (
              <button
                type="button"
                className="button button-primary button-large"
                onClick={submit}
                disabled={busy}
              >
                {busy ? t('action.sending') : t('action.submit')}
                {!busy && <ArrowRight size={17} />}
              </button>
            )}
          </div>
        </div>

        <aside className="report-aside">
          <div className="aside-card green">
            <span className="aside-icon"><Sparkles size={19} /></span>
            <h3>Keep it clear and simple</h3>
            <ul>
              <li><Check size={14} /> Show the whole problem in the photo</li>
              <li><Check size={14} /> Mention a nearby landmark</li>
              <li><Check size={14} /> Write in your own language</li>
            </ul>
          </div>
          <div className="aside-card">
            <span className="aside-icon amber"><ShieldCheck size={19} /></span>
            <h3>What happens next?</h3>
            <p>
              Woreda 04 receives your report immediately. An officer acknowledges
              it, assigns the right department, and updates you at each step.
            </p>
            <div className="aside-mini-timeline">
              <span><i className="done" /> Received</span>
              <span><i className="done" /> Acknowledged</span>
              <span><i /> Assigned</span>
              <span><i /> Resolved</span>
            </div>
          </div>
          <div className="aside-help">
            <span>Need help?</span>
            <a href="tel:+251110000000">Call 011 000 0000</a>
            <small>Mon–Fri · 8:30–17:00</small>
          </div>
        </aside>
      </div>
    </div>
  );
}
