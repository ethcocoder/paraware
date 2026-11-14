import { useEffect, useState } from 'react';
import { Megaphone, Pin, BellRing, ArrowRight } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import { formatDate } from '../format';
import { EmptyState, PageLoader } from '../components/UI';
import { useDocumentTitle } from '../hooks';

export default function CitizenAnnouncements() {
  const { t, lang } = useLanguage();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  useDocumentTitle('Announcements');

  useEffect(() => {
    api('/announcements')
      .then((data) => setAnnouncements(data.announcements))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="page announcements-page">
      <header className="announcements-hero">
        <div>
          <span className="eyebrow">Official channel</span>
          <h1>{t('announcements.title')}</h1>
          <p>{t('announcements.subtitle')}</p>
        </div>
        <div className="announcements-hero-art" aria-hidden="true">
          <span className="announcement-ring ring-a" />
          <span className="announcement-ring ring-b" />
          <span className="announcement-megaphone"><Megaphone size={30} /></span>
          <span className="announcement-badge"><BellRing size={14} /> Every account is notified</span>
        </div>
      </header>

      <div className="announcement-feed">
        {announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={t('announcements.empty')}
            description="Check back soon for official updates from the Woreda."
          />
        ) : (
          announcements.map((item) => (
            <article key={item.id} className={`announcement-card ${item.pinned ? 'pinned' : ''}`}>
              <div className="announcement-card-side">
                <span className="announcement-card-icon"><Megaphone size={21} /></span>
                <span className="announcement-card-date">
                  {formatDate(item.publishedAt, lang, { month: 'short' })}
                </span>
              </div>
              <div className="announcement-card-body">
                <div className="announcement-card-meta">
                  <span className="announcement-category">{item.category}</span>
                  {item.pinned && <span className="pinned-tag"><Pin size={12} /> {t('announcements.pinned')}</span>}
                  <span className="announcement-author">Woreda 04 · {item.author}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
                <span className="announcement-footer">
                  Official announcement <ArrowRight size={14} />
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="announcement-note">
        <BellRing size={18} />
        <span>
          <strong>Announcements arrive in your notifications.</strong>
          You can also find service notices and community updates here at any time.
        </span>
      </div>
    </div>
  );
}
