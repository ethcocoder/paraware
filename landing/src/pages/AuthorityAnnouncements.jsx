import { useEffect, useState } from 'react';
import {
  Megaphone,
  Pin,
  Send,
  CheckCircle2,
  BellRing,
  ShieldCheck,
  CalendarDays,
  Plus,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { formatDate } from '../format';
import { PageLoader } from '../components/UI';
import { useDocumentTitle } from '../hooks';
import { useToast } from '../toast';

const CATEGORY_OPTIONS = ['Service notice', 'Community', 'Announcement', 'Public safety', 'Health'];

export default function AuthorityAnnouncements() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { push } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showComposer, setShowComposer] = useState(true);
  const [form, setForm] = useState({
    title: '',
    body: '',
    category: 'Service notice',
    pinned: false,
  });
  useDocumentTitle('Announcements');

  const canPublish = user.role === 'admin';

  useEffect(() => {
    api('/announcements')
      .then((data) => setAnnouncements(data.announcements))
      .finally(() => setLoading(false));
  }, []);

  async function publish(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await api('/announcements', {
        method: 'POST',
        body: form,
      });
      setAnnouncements((current) => [data.announcement, ...current]);
      setForm({ title: '', body: '', category: 'Service notice', pinned: false });
      setShowComposer(false);
      push(t('authority.published'));
    } catch (err) {
      push(err.message, 'info');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="authority-page authority-announcements-page">
      <header className="authority-page-head">
        <div>
          <span className="eyebrow">Citizen communication</span>
          <h1>{t('authority.announcementsTitle')}</h1>
          <p>{t('authority.announcementsSub')}</p>
        </div>
        {canPublish && (
          <button
            type="button"
            className="button button-primary"
            onClick={() => setShowComposer((value) => !value)}
          >
            <Plus size={17} /> {t('authority.compose')}
          </button>
        )}
      </header>

      {!canPublish && (
        <div className="permission-note">
          <ShieldCheck size={17} />
          <span>
            <strong>Read-only access</strong>
            Only Woreda administrators can publish official announcements.
          </span>
        </div>
      )}

      <div className={`announcement-workspace ${showComposer && canPublish ? 'with-composer' : ''}`}>
        {showComposer && canPublish && (
          <form className="announcement-composer" onSubmit={publish}>
            <div className="composer-heading">
              <span className="composer-heading-icon"><Megaphone size={19} /></span>
              <div>
                <h2>{t('authority.compose')}</h2>
                <p>Every citizen account will receive a notification.</p>
              </div>
            </div>
            <label className="field">
              <span>{t('authority.announcementTitle')}</span>
              <input
                placeholder={t('authority.announcementTitlePlaceholder')}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                maxLength={140}
              />
            </label>
            <label className="field">
              <span>{t('authority.announcementBody')}</span>
              <textarea
                rows={6}
                placeholder={t('authority.announcementBodyPlaceholder')}
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                required
                maxLength={3000}
              />
              <span className="char-count inline-count">{form.body.length} / 3000</span>
            </label>
            <div className="composer-row">
              <label className="field compact-field">
                <span>{t('authority.announcementCategory')}</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="pin-toggle">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
                />
                <span className="pin-toggle-box"><Pin size={14} /></span>
                <span>
                  <strong>{t('authority.pin')}</strong>
                  <small>Keep at the top of the feed</small>
                </span>
              </label>
            </div>
            <div className="composer-preview-note">
              <BellRing size={15} />
              This will notify all registered citizens immediately.
            </div>
            <div className="composer-actions">
              <button type="button" className="button button-ghost" onClick={() => setShowComposer(false)}>
                {t('action.cancel')}
              </button>
              <button type="submit" className="button button-primary" disabled={busy}>
                <Send size={15} /> {busy ? t('action.sending') : t('action.publish')}
              </button>
            </div>
          </form>
        )}

        <section className="published-announcements">
          <div className="published-heading">
            <div>
              <span className="eyebrow">Published record</span>
              <h2>All announcements</h2>
            </div>
            <span className="published-count">{announcements.length} total</span>
          </div>
          <div className="published-list">
            {announcements.map((item) => (
              <article key={item.id} className={`published-item ${item.pinned ? 'pinned' : ''}`}>
                <div className="published-item-top">
                  <span className="published-category"><Megaphone size={13} /> {item.category}</span>
                  {item.pinned && <span className="pinned-tag"><Pin size={12} /> {t('announcements.pinned')}</span>}
                  <span className="published-date"><CalendarDays size={13} /> {formatDate(item.publishedAt, lang)}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <div className="published-item-foot">
                  <span><CheckCircle2 size={13} /> Delivered to citizens</span>
                  <span>{item.author}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
