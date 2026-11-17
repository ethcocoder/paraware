import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  Flame,
  ImagePlus,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { CATEGORY_MAP, STATUSES } from '../constants';
import { formatDate, formatTime, timeAgo } from '../format';
import { CategoryPill, PriorityBadge, StatusBadge } from '../components/Badges';
import { MapPanel, PageLoader } from '../components/UI';
import { useDocumentTitle } from '../hooks';
import { useToast } from '../toast';
import { compressImage } from '../image';

const WORKFLOW_STATUSES = [
  'received',
  'acknowledged',
  'assigned',
  'under_review',
  'in_progress',
];

const QUICK_REPLIES = [
  'Thank you for reporting this. We have received your report and will update you shortly.',
  'Could you please share one more photo or a nearby landmark so our team can find the exact location?',
  'Our team has completed the work. Please let us know if the problem continues.',
];

const EVENT_LABELS = {
  submitted: 'Report submitted',
  received: 'Report received',
  acknowledged: 'Report acknowledged',
  assigned: 'Department assigned',
  under_review: 'Review started',
  in_progress: 'Work started',
  resolved: 'Report resolved',
  closed: 'Report closed',
  note: 'Administrative note',
};

export default function AuthorityReport() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { push } = useToast();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    departmentId: '',
    assignedTo: '',
    priority: 'normal',
    status: 'received',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [evidenceName, setEvidenceName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [zoom, setZoom] = useState(null);
  const fileRef = useRef(null);
  useDocumentTitle(report?.reference || 'Report');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api(`/reports/${id}`), api('/departments'), api('/staff')])
      .then(([reportData, deptData, staffData]) => {
        if (!active) return;
        const item = reportData.report;
        setReport(item);
        setDepartments(deptData.departments);
        setStaff(staffData.staff);
        setForm({
          departmentId: item.department?.id || '',
          assignedTo: item.assignedTo?.id || '',
          priority: item.priority || 'normal',
          status: item.status,
          note: '',
        });
        setResolutionNote(item.resolution?.note || '');
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!zoom) return undefined;
    const onKey = (event) => event.key === 'Escape' && setZoom(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoom]);

  const ai = report?.aiSuggestion;
  const suggestedDepartment = useMemo(
    () => departments.find((department) => department.id === ai?.departmentId),
    [departments, ai]
  );

  const visibleStaff = useMemo(
    () =>
      staff.filter(
        (person) =>
          !form.departmentId ||
          person.department_id === form.departmentId ||
          person.role === 'admin'
      ),
    [staff, form.departmentId]
  );

  function applyReport(item) {
    setReport((current) => ({ ...item, similarReports: current?.similarReports || item.similarReports }));
    setForm((current) => ({
      ...current,
      departmentId: item.department?.id || '',
      assignedTo: item.assignedTo?.id || '',
      priority: item.priority,
      status: item.status,
      note: '',
    }));
    setResolutionNote(item.resolution?.note || '');
  }

  async function patch(payload, successMessage) {
    setSaving(true);
    try {
      const data = await api(`/reports/${id}`, { method: 'PATCH', body: payload });
      applyReport(data.report);
      push(successMessage || t('authority.updated'));
      return data.report;
    } catch (err) {
      push(err.message, 'info');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function acknowledge() {
    await patch(
      {
        status: 'acknowledged',
        note: 'Receipt confirmed by Woreda 04. Your report is being reviewed.',
      },
      'Report acknowledged. The citizen has been notified.'
    );
  }

  async function saveAssignment(event) {
    event.preventDefault();
    await patch({
      departmentId: form.departmentId || null,
      assignedTo: form.assignedTo || null,
      priority: form.priority,
      status: form.status,
      note: form.note || undefined,
    });
  }

  async function handleEvidence(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setEvidence(dataUrl);
      setEvidenceName(file.name);
    } catch (err) {
      push(err.message, 'info');
    }
  }

  async function resolveReport() {
    if (resolutionNote.trim().length < 10) {
      push('Add a short resolution note before marking the report resolved.', 'info');
      return;
    }
    setResolving(true);
    try {
      const data = await api(`/reports/${id}`, {
        method: 'PATCH',
        body: {
          status: 'resolved',
          resolutionNote: resolutionNote.trim(),
          resolutionPhotoDataUrl: evidence || undefined,
          note: 'Resolution recorded. Supporting evidence has been added.',
        },
      });
      applyReport(data.report);
      push('Report marked resolved. The citizen has been notified.');
    } catch (err) {
      push(err.message, 'info');
    } finally {
      setResolving(false);
    }
  }

  async function closeReport() {
    if (!confirmClose) {
      setConfirmClose(true);
      window.setTimeout(() => setConfirmClose(false), 4000);
      return;
    }
    const updated = await patch(
      {
        status: 'closed',
        note: 'Report closed after the resolution was confirmed.',
      },
      'Report closed.'
    );
    if (updated) setConfirmClose(false);
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const data = await api(`/reports/${id}/messages`, {
        method: 'POST',
        body: { body: message.trim(), internal },
      });
      setReport((current) => ({
        ...current,
        messages: [...current.messages, data.message],
        messageCount: current.messageCount + (internal ? 0 : 1),
      }));
      setMessage('');
      push(internal ? 'Internal note added.' : t('authority.messageSent'));
    } catch (err) {
      push(err.message, 'info');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error || !report) {
    return (
      <div className="authority-page detail-missing">
        <FileText size={34} />
        <h1>Report not found</h1>
        <p>{error || 'This report could not be opened.'}</p>
        <Link to="/authority" className="button button-primary">
          <ArrowLeft size={16} /> Back to inbox
        </Link>
      </div>
    );
  }

  const category = CATEGORY_MAP[report.category] || CATEGORY_MAP.other;
  const isNew = ['submitted', 'received'].includes(report.status);
  const isResolved = ['resolved', 'closed'].includes(report.status);
  const isClosed = report.status === 'closed';

  return (
    <div className="authority-page authority-detail-page">
      <div className="authority-detail-topbar">
        <Link to="/authority" className="back-link">
          <ArrowLeft size={16} /> {t('nav.inbox')}
        </Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{report.reference}</span>
        <span className="detail-top-spacer" />
        {isNew && (
          <button type="button" className="button button-gold button-small" onClick={acknowledge} disabled={saving}>
            <CheckCircle2 size={15} /> {t('authority.acknowledge')}
          </button>
        )}
        <StatusBadge status={report.status} />
      </div>

      <header className="authority-detail-head">
        <div className="authority-detail-title">
          <div className="detail-heading-meta">
            <CategoryPill category={report.category} />
            <PriorityBadge priority={report.priority} />
            <span className="detail-age"><Clock3 size={13} /> {timeAgo(report.createdAt, lang)}</span>
          </div>
          <h1>{report.title}</h1>
          <p>
            {report.reference} · {report.citizen?.name} · {report.location?.name}
          </p>
        </div>
        <div className="authority-head-actions">
          {report.department ? (
            <span className="dept-tag large" style={{ '--dept': report.department.color }}>
              {report.department.name}
            </span>
          ) : (
            <span className="dept-tag large unassigned">{t('authority.unassigned')}</span>
          )}
          <button type="button" className="icon-button" onClick={() => navigate('/authority')} aria-label="Close detail">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="authority-detail-grid">
        <div className="authority-detail-main">
          <section className="authority-evidence-card">
            <button
              type="button"
              className="authority-evidence-photo"
              onClick={() => report.photoUrl && setZoom(report.photoUrl)}
            >
              <img src={report.photoUrl} alt="Citizen report attachment" />
              <span className="zoom-hint">View full photo</span>
            </button>
            <div className="authority-evidence-info">
              <div>
                <span className="eyebrow">Citizen description</span>
                <p>{report.description}</p>
              </div>
              <div className="evidence-meta-strip">
                <span><MapPin size={14} /> {report.location?.name}</span>
                <span><Clock3 size={14} /> {formatDate(report.createdAt, lang)} · {formatTime(report.createdAt, lang)}</span>
                <span className="verified-strip"><ShieldCheck size={14} /> Verified citizen account</span>
              </div>
            </div>
          </section>

          <div className="detail-two-column">
            <section className="detail-block map-block">
              <div className="detail-block-head">
                <div>
                  <span className="eyebrow">Reported location</span>
                  <h2>{t('detail.location')}</h2>
                </div>
                <MapPin size={17} />
              </div>
              <MapPanel location={report.location} height={220} />
              <div className="location-address">
                <strong>{report.location?.name || t('common.notProvided')}</strong>
                {report.location?.latitude && (
                  <span>
                    {Number(report.location.latitude).toFixed(5)}, {Number(report.location.longitude).toFixed(5)}
                  </span>
                )}
              </div>
            </section>

            <section className="detail-block ai-block">
              <div className="detail-block-head">
                <div>
                  <span className="eyebrow">Assistive analysis</span>
                  <h2>{t('authority.aiTitle')}</h2>
                </div>
                <span className="ai-spark"><Sparkles size={17} /></span>
              </div>
              <div className="ai-summary">
                <span className="ai-confidence">
                  <strong>{Math.round((ai?.confidence || 0) * 100)}%</strong>
                  <small>{t('authority.confidence')}</small>
                </span>
                <p>{ai?.summary || report.description.slice(0, 160)}</p>
              </div>
              <div className="ai-suggestions">
                <div>
                  <span>{t('authority.suggestedDepartment')}</span>
                  <strong>{suggestedDepartment?.name || 'Needs review'}</strong>
                </div>
                <div>
                  <span>{t('authority.suggestedPriority')}</span>
                  <PriorityBadge priority={ai?.priority || report.priority} />
                </div>
              </div>
              <button
                type="button"
                className="button button-soft button-small ai-use"
                onClick={() => {
                  if (ai?.departmentId) {
                    setForm((current) => ({
                      ...current,
                      departmentId: ai.departmentId,
                      priority: ai.priority || current.priority,
                    }));
                  }
                  push('Suggestion added to the assignment form. Review before saving.', 'info');
                }}
              >
                <Check size={14} /> Use suggestion
              </button>
              <p className="ai-disclaimer">{t('authority.aiDisclaimer')}</p>
            </section>
          </div>

          <section className="detail-block">
            <div className="detail-block-head">
              <div>
                <span className="eyebrow">Audit trail</span>
                <h2>{t('authority.activity')}</h2>
              </div>
              <span className="detail-block-meta">{report.events.length} events</span>
            </div>
            <ol className="authority-timeline">
              {report.events.map((event, index) => (
                <li key={event.id}>
                  <span className={`authority-timeline-node ${index === report.events.length - 1 ? 'latest' : ''}`}>
                    {index === report.events.length - 1 ? <span className="timeline-live-dot" /> : <Check size={11} />}
                  </span>
                  <div className="authority-timeline-content">
                    <div>
                      <strong>{EVENT_LABELS[event.type] || t(`status.${event.type}`)}</strong>
                      <time>{formatDate(event.createdAt, lang)} · {formatTime(event.createdAt, lang)}</time>
                    </div>
                    {event.note && <p>{event.note}</p>}
                    <span className="timeline-actor">
                      {event.actor?.role === 'citizen' ? 'Citizen' : event.actor?.name || 'System'}
                      {event.actor?.role && event.actor.role !== 'citizen' ? ' · Woreda 04' : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {report.similarReports?.length > 0 && (
            <section className="detail-block similar-block">
              <div className="detail-block-head">
                <div>
                  <span className="eyebrow">Context</span>
                  <h2>{t('authority.similar')}</h2>
                </div>
                <FileCheck2 size={17} />
              </div>
              <div className="similar-list">
                {report.similarReports.map((similar) => (
                  <Link key={similar.id} to={`/authority/reports/${similar.id}`} className="similar-item">
                    <span className="similar-thumb">
                      {similar.photoUrl && <img src={similar.photoUrl} alt="" />}
                    </span>
                    <span>
                      <small>{similar.reference} · {timeAgo(similar.createdAt, lang)}</small>
                      <strong>{similar.title}</strong>
                      <span className="similar-status"><StatusBadge status={similar.status} /></span>
                    </span>
                    <ChevronRight size={16} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="detail-block conversation-block">
            <div className="detail-block-head">
              <div>
                <span className="eyebrow">Two-way communication</span>
                <h2>{t('detail.conversation')}</h2>
              </div>
              <span className="detail-block-meta">{report.messageCount || 0} citizen messages</span>
            </div>
            <div className="authority-message-list">
              {report.messages.length === 0 && (
                <p className="empty-messages">No messages yet. Send the first update to the citizen.</p>
              )}
              {report.messages.map((item) => (
                <div key={item.id} className={`authority-message ${item.internal ? 'internal' : ''} ${item.author.id === user.id ? 'mine' : ''}`}>
                  <span className="authority-message-avatar">
                    {item.author.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </span>
                  <div>
                    <div className="authority-message-meta">
                      <strong>{item.author.name}</strong>
                      <span>{item.author.role === 'citizen' ? 'Citizen' : 'Woreda 04'}</span>
                      {item.internal && <span className="internal-tag">Internal note</span>}
                      <time>{timeAgo(item.createdAt, lang)}</time>
                    </div>
                    <p>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <form className="authority-composer" onSubmit={sendMessage}>
              <div className="composer-tabs">
                <button
                  type="button"
                  className={!internal ? 'active' : ''}
                  onClick={() => setInternal(false)}
                >
                  <Send size={14} /> {t('authority.replyPublic')}
                </button>
                <button
                  type="button"
                  className={internal ? 'active' : ''}
                  onClick={() => setInternal(true)}
                >
                  <MessageSquare size={14} /> {t('authority.internalNote')}
                </button>
                {internal && <span className="composer-internal-hint">Visible to Woreda staff only</span>}
              </div>
              <textarea
                rows={3}
                placeholder={internal ? 'Add an internal note for the response team…' : t('authority.replyPlaceholder')}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={2000}
              />
              <div className="composer-footer">
                <div className="quick-replies">
                  {QUICK_REPLIES.slice(0, internal ? 1 : 2).map((reply, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => setMessage(reply)}
                    >
                      {index === 0 ? 'Receipt reply' : 'Need more info'}
                    </button>
                  ))}
                </div>
                <button type="submit" className="button button-primary button-small" disabled={sending || !message.trim()}>
                  <Send size={15} /> {sending ? t('action.sending') : internal ? 'Save note' : t('authority.sendReply')}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="authority-action-rail">
          {isNew && (
            <div className="acknowledge-callout">
              <span className="acknowledge-icon"><Flame size={20} /></span>
              <div>
                <strong>New report — needs acknowledgement</strong>
                <p>Confirm receipt so the citizen knows someone is looking.</p>
              </div>
              <button type="button" className="button button-gold button-small" onClick={acknowledge} disabled={saving}>
                <CheckCircle2 size={15} /> {t('authority.acknowledge')}
              </button>
            </div>
          )}

          <div className="citizen-card">
            <div className="citizen-card-head">
              <span className="citizen-card-avatar">
                {report.citizen?.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </span>
              <div>
                <span className="eyebrow">{t('authority.citizen')}</span>
                <strong>{report.citizen?.name}</strong>
                <small>Citizen reporter</small>
              </div>
              <ShieldCheck size={17} className="citizen-verified" />
            </div>
            <div className="citizen-contact-list">
              <a href={`tel:${report.citizen?.phone}`}>
                <Phone size={15} />
                <span><strong>{report.citizen?.phone || 'No phone'}</strong><small>Call citizen</small></span>
                <ArrowRight size={14} />
              </a>
              {report.citizen?.email && (
                <a href={`mailto:${report.citizen.email}`}>
                  <Mail size={15} />
                  <span><strong>{report.citizen.email}</strong><small>Send email</small></span>
                  <ArrowRight size={14} />
                </a>
              )}
            </div>
            <div className="citizen-card-foot">
              <span>{t('authority.reported')} {timeAgo(report.createdAt, lang)}</span>
              <span>{report.reference}</span>
            </div>
          </div>

          <form className="action-card assignment-card" onSubmit={saveAssignment}>
            <div className="action-card-head">
              <span className="action-card-icon"><Building2 size={17} /></span>
              <div>
                <h3>{t('authority.assignTitle')}</h3>
                <p>Set ownership and priority</p>
              </div>
            </div>
            <label className="field compact-field">
              <span>{t('detail.department')}</span>
              <select
                value={form.departmentId}
                onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value, assignedTo: '' }))}
              >
                <option value="">{t('authority.selectDepartment')}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span>{t('authority.assignedTo')}</span>
              <select
                value={form.assignedTo}
                onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
              >
                <option value="">{t('authority.selectOfficer')}</option>
                {visibleStaff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {person.role === 'admin' ? 'Admin' : person.department || 'Officer'}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-row compact-row">
              <label className="field compact-field">
                <span>{t('detail.priority')}</span>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="low">{t('priority.low')}</option>
                  <option value="normal">{t('priority.normal')}</option>
                  <option value="high">{t('priority.high')}</option>
                  <option value="urgent">{t('priority.urgent')}</option>
                </select>
              </label>
              <label className="field compact-field">
                <span>{t('authority.status')}</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  disabled={isResolved}
                >
                  {WORKFLOW_STATUSES.map((status) => (
                    <option key={status} value={status}>{t(`status.${status}`)}</option>
                  ))}
                  {isResolved && (
                    <option value={report.status}>{t(`status.${report.status}`)}</option>
                  )}
                </select>
              </label>
            </div>
            <label className="field compact-field">
              <span>Note to include in the timeline <small className="optional">{t('common.optional')}</small></span>
              <textarea
                rows={2}
                placeholder="e.g. Site visit scheduled for tomorrow morning."
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
            </label>
            <button type="submit" className="button button-primary button-block button-small" disabled={saving}>
              {saving ? t('action.saving') : t('authority.saveUpdate')}
            </button>
          </form>

          <div className="action-card resolution-action-card">
            <div className="action-card-head">
              <span className="action-card-icon green"><FileCheck2 size={17} /></span>
              <div>
                <h3>{t('authority.resolutionTitle')}</h3>
                <p>Record the work completed</p>
              </div>
              {isResolved && <span className="resolved-flag"><CheckCircle2 size={14} /> {t(`status.${report.status}`)}</span>}
            </div>
            {isResolved && report.resolution ? (
              <div className="existing-resolution">
                <p>{report.resolution.note}</p>
                {report.resolution.photoUrl && (
                  <button
                    type="button"
                    className="resolution-evidence-thumb"
                    onClick={() => setZoom(report.resolution.photoUrl)}
                  >
                    <img src={report.resolution.photoUrl} alt="Resolution evidence" />
                    <span><ShieldCheck size={12} /> {t('authority.resolvedEvidence')}</span>
                  </button>
                )}
                {report.status === 'resolved' && (
                  <button
                    type="button"
                    className={`button button-soft button-block button-small ${confirmClose ? 'confirming' : ''}`}
                    onClick={closeReport}
                  >
                    {confirmClose ? 'Click again to confirm closure' : t('authority.closeReport')}
                    {!confirmClose && <ArrowRight size={14} />}
                  </button>
                )}
                {isClosed && <span className="closed-note"><CheckCircle2 size={14} /> This report is closed.</span>}
              </div>
            ) : (
              <>
                <label className="field compact-field">
                  <span>{t('authority.resolutionNote')}</span>
                  <textarea
                    rows={3}
                    placeholder={t('authority.resolutionPlaceholder')}
                    value={resolutionNote}
                    onChange={(event) => setResolutionNote(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className={`evidence-upload ${evidence ? 'has-file' : ''}`}
                  onClick={() => fileRef.current?.click()}
                >
                  <span className="evidence-upload-icon">
                    {evidence ? <CheckCircle2 size={19} /> : <ImagePlus size={19} />}
                  </span>
                  <span>
                    <strong>{evidence ? evidenceName : t('authority.uploadEvidence')}</strong>
                    <small>{evidence ? 'Photo ready to attach' : 'JPEG, PNG or WebP · optional but recommended'}</small>
                  </span>
                  {evidence ? <X size={15} onClick={(event) => { event.stopPropagation(); setEvidence(null); setEvidenceName(''); }} /> : <Upload size={15} />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleEvidence} />
                {evidence && (
                  <div className="evidence-preview">
                    <img src={evidence} alt="Evidence preview" />
                    <span>{t('authority.evidencePreview')}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="button button-primary button-block button-small"
                  onClick={resolveReport}
                  disabled={resolving || resolutionNote.trim().length < 10}
                >
                  {resolving ? t('action.saving') : t('authority.markResolved')}
                  {!resolving && <CheckCircle2 size={15} />}
                </button>
              </>
            )}
          </div>

          <div className="action-card meta-card">
            <h3>Report metadata</h3>
            <dl>
              <div><dt>{t('detail.reference')}</dt><dd>{report.reference}</dd></div>
              <div><dt>{t('detail.submitted')}</dt><dd>{formatDate(report.createdAt, lang)} · {formatTime(report.createdAt, lang)}</dd></div>
              <div><dt>{t('authority.reported')} by</dt><dd>{report.citizen?.name}</dd></div>
              <div><dt>{t('detail.assignedTo')}</dt><dd>{report.assignedTo?.name || 'Unassigned'}</dd></div>
            </dl>
          </div>
        </aside>
      </div>

      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo preview" onClick={() => setZoom(null)}>
          <button type="button" className="lightbox-close" onClick={() => setZoom(null)} aria-label="Close preview">
            <X size={20} />
          </button>
          <img src={zoom} alt="Full size attachment" onClick={(event) => event.stopPropagation()} />
          <span className="lightbox-note">Citizen attachment · {report.reference}</span>
        </div>
      )}
    </div>
  );
}
