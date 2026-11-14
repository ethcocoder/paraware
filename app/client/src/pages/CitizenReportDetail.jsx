import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  Clipboard,
  Clock3,
  FileText,
  Hammer,
  Inbox,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { timeAgo, formatDate, formatTime } from '../format';
import { CategoryPill, PriorityBadge, StatusBadge } from '../components/Badges';
import { MapPanel, PageLoader, ProgressSteps } from '../components/UI';
import { useDocumentTitle } from '../hooks';
import { useToast } from '../toast';

const EVENT_ICONS = {
  submitted: Send,
  received: Inbox,
  acknowledged: CheckCheck,
  assigned: UserPlus,
  under_review: Search,
  in_progress: Hammer,
  resolved: CheckCircle2,
  closed: Lock,
  note: MessageSquare,
};

const PHASES = ['submitted', 'acknowledged', 'in_progress', 'resolved'];

function phaseIndex(status) {
  if (['submitted', 'received'].includes(status)) return 0;
  if (['acknowledged', 'assigned', 'under_review'].includes(status)) return 1;
  if (status === 'in_progress') return 2;
  return 3;
}

export default function CitizenReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { push } = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEnd = useRef(null);
  useDocumentTitle(report?.reference || 'Report');

  useEffect(() => {
    setLoading(true);
    api(`/reports/${id}`)
      .then((data) => setReport(data.report))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (report?.messages?.length) {
      messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [report?.messages?.length]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const data = await api(`/reports/${id}/messages`, {
        method: 'POST',
        body: { body: message.trim() },
      });
      setReport((current) => ({
        ...current,
        messages: [...current.messages, data.message],
        messageCount: current.messageCount + 1,
      }));
      setMessage('');
      push(t('detail.messageSent'));
    } catch (err) {
      push(err.message, 'info');
    } finally {
      setSending(false);
    }
  }

  function copyReference() {
    navigator.clipboard?.writeText(report.reference).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  if (loading) return <PageLoader />;
  if (error || !report) {
    return (
      <div className="page detail-missing">
        <FileText size={34} />
        <h1>{t('detail.notFound')}</h1>
        <p>{error || t('detail.notFoundDesc')}</p>
        <Link to="/app/reports" className="button button-primary">
          <ArrowLeft size={17} /> {t('nav.reports')}
        </Link>
      </div>
    );
  }

  const currentPhase = phaseIndex(report.status);
  const resolved = ['resolved', 'closed'].includes(report.status);

  return (
    <div className="page citizen-detail-page">
      <div className="detail-topbar">
        <Link to="/app/reports" className="back-link">
          <ArrowLeft size={16} /> {t('nav.reports')}
        </Link>
        <span className="detail-reference">
          {t('detail.reference')} <strong>{report.reference}</strong>
          <button type="button" className="copy-button" onClick={copyReference} aria-label="Copy reference">
            {copied ? <CheckCircle2 size={14} /> : <Clipboard size={14} />}
          </button>
        </span>
      </div>

      <header className="detail-heading">
        <div className="detail-heading-meta">
          <CategoryPill category={report.category} />
          <StatusBadge status={report.status} />
          <PriorityBadge priority={report.priority} />
        </div>
        <h1>{report.title}</h1>
        <p>
          Submitted {timeAgo(report.createdAt, lang)} · {report.location?.name}
        </p>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="detail-photo-card">
            {report.photoUrl && (
              <img src={report.photoUrl} alt="Photograph attached to this report" />
            )}
            <div className="detail-photo-overlay">
              <span><MapPin size={14} /> {report.location?.name}</span>
              <span><Clock3 size={14} /> {formatDate(report.createdAt, lang)}</span>
            </div>
          </section>

          <section className="detail-section">
            <h2>{t('detail.title')}</h2>
            <p className="detail-description">{report.description}</p>
            <div className="original-note">
              <ShieldCheck size={16} />
              <span>
                <strong>Original citizen description</strong>
                <small>Preserved exactly as submitted. Paraware Assist suggestions never replace it.</small>
              </span>
            </div>
          </section>

          <section className="detail-section">
            <div className="section-heading compact">
              <div>
                <span className="eyebrow">Progress</span>
                <h2>{t('detail.timeline')}</h2>
              </div>
              <span className="timeline-count">{report.events.length} updates</span>
            </div>
            <ol className="report-timeline">
              {report.events.map((event, index) => {
                const Icon = EVENT_ICONS[event.type] || MessageSquare;
                const last = index === report.events.length - 1;
                return (
                  <li key={event.id} className={last ? 'latest' : ''}>
                    <span className={`timeline-icon event-${event.type}`}>
                      <Icon size={16} />
                    </span>
                    <div className="timeline-content">
                      <div className="timeline-row">
                        <strong>{t(`status.${event.type}`) !== `status.${event.type}` ? t(`status.${event.type}`) : event.note || 'Update'}</strong>
                        <time>{formatDate(event.createdAt, lang, { year: undefined })} · {formatTime(event.createdAt, lang)}</time>
                      </div>
                      {event.note && <p>{event.note}</p>}
                      {event.actor && (
                        <span className="timeline-actor">
                          {event.actor.role === 'citizen' ? 'You' : event.actor.name}
                          {event.actor.role !== 'citizen' && ' · Woreda 04'}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {report.resolution && (
            <section className="resolution-card">
              <div className="resolution-head">
                <span className="resolution-icon"><CheckCircle2 size={22} /></span>
                <div>
                  <span className="eyebrow">Resolution recorded</span>
                  <h2>{t('detail.resolution')}</h2>
                </div>
                <span className="resolution-date">
                  {report.resolvedAt ? formatDate(report.resolvedAt, lang) : ''}
                </span>
              </div>
              <p>{report.resolution.note}</p>
              {report.resolution.photoUrl && (
                <div className="resolution-photo">
                  <img src={report.resolution.photoUrl} alt="Evidence of the completed work" />
                  <span><ShieldCheck size={13} /> {t('detail.evidence')}</span>
                </div>
              )}
            </section>
          )}

          <section className="detail-section conversation-section">
            <div className="section-heading compact">
              <div>
                <span className="eyebrow">Messages</span>
                <h2>{t('detail.conversation')}</h2>
              </div>
              <span className="timeline-count">{report.messages.length}</span>
            </div>
            <div className="message-list">
              {report.messages.length === 0 && (
                <p className="empty-messages">{t('detail.noMessages')}</p>
              )}
              {report.messages.map((item) => {
                const mine = item.author.id === user.id;
                return (
                  <div key={item.id} className={`message-row ${mine ? 'mine' : 'theirs'}`}>
                    <span className={`message-avatar ${mine ? 'mine' : ''}`}>
                      {item.author.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </span>
                    <div className="message-bubble">
                      <div className="message-meta">
                        <strong>{mine ? 'You' : item.author.name}</strong>
                        <span>{!mine ? 'Woreda 04' : t('common.citizen')}</span>
                        <time>{timeAgo(item.createdAt, lang)}</time>
                      </div>
                      <p>{item.body}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEnd} />
            </div>
            <form className="message-composer" onSubmit={sendMessage}>
              <textarea
                rows={2}
                placeholder={t('detail.messagePlaceholder')}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={2000}
              />
              <button
                type="submit"
                className="button button-primary send-message-button"
                disabled={sending || !message.trim()}
              >
                <Send size={16} />
                <span>{sending ? t('action.sending') : t('action.send')}</span>
              </button>
            </form>
          </section>
        </div>

        <aside className="detail-aside">
          <div className={`status-card ${resolved ? 'resolved' : ''}`}>
            <span className="status-card-icon">
              {resolved ? <CheckCircle2 size={24} /> : <Clock3 size={24} />}
            </span>
            <span className="eyebrow">{t('detail.timeline')}</span>
            <h3>{report.statusLabel}</h3>
            <p>{report.statusDescription}</p>
            <div className="phase-tracker">
              {PHASES.map((phase, index) => (
                <div
                  key={phase}
                  className={`phase ${index <= currentPhase ? 'done' : ''} ${
                    index === currentPhase ? 'current' : ''
                  }`}
                >
                  <span className="phase-node">{index < currentPhase ? '✓' : index + 1}</span>
                  <span>{t(`status.${phase}`)}</span>
                </div>
              ))}
            </div>
            <div className="status-card-foot">
              <span>Last update</span>
              <strong>{timeAgo(report.updatedAt, lang)}</strong>
            </div>
          </div>

          <div className="aside-detail-card">
            <h3>{t('detail.title')}</h3>
            <dl>
              <div><dt>{t('detail.department')}</dt><dd>{report.department?.name || 'Awaiting assignment'}</dd></div>
              <div><dt>{t('detail.assignedTo')}</dt><dd>{report.assignedTo?.name || 'Not yet assigned'}</dd></div>
              <div><dt>{t('detail.priority')}</dt><dd><PriorityBadge priority={report.priority} /></dd></div>
              <div><dt>{t('detail.submitted')}</dt><dd>{formatDate(report.createdAt, lang)}</dd></div>
            </dl>
          </div>

          <div className="aside-map-card">
            <div className="aside-card-head">
              <h3>{t('detail.location')}</h3>
              <MapPin size={16} />
            </div>
            <MapPanel location={report.location} height={190} />
          </div>

          <div className="detail-contact-card">
            <div>
              <span className="contact-icon"><Phone size={17} /></span>
              <span>
                <strong>Woreda 04 office</strong>
                <small>Questions about this report?</small>
              </span>
            </div>
            <a href="tel:+251110000000" className="button button-soft button-small">
              Call office <ArrowRight size={14} />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
