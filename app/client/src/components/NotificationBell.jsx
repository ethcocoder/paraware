import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Megaphone } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { timeAgo } from '../format';
import { useNavigate } from 'react-router-dom';

export function NotificationBell({ light = false }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!user) return;
    try {
      const data = await api('/notifications');
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      if (!quiet) setItems([]);
    }
  }, [user]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load({ quiet: true }), 45000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function openItem(item) {
    if (!item.read) {
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry))
      );
      setUnread((count) => Math.max(0, count - 1));
      api('/notifications/read', { method: 'POST', body: { id: item.id } }).catch(() => {});
    }
    setOpen(false);
    if (item.reportId) {
      navigate(
        user.role === 'citizen'
          ? `/app/reports/${item.reportId}`
          : `/authority/reports/${item.reportId}`
      );
    } else if (item.type === 'announcement') {
      navigate(user.role === 'citizen' ? '/app/announcements' : '/authority/announcements');
    }
  }

  async function markAll() {
    setItems((current) => current.map((entry) => ({ ...entry, read: true })));
    setUnread(0);
    try {
      await api('/notifications/read', { method: 'POST', body: {} });
    } catch {
      load();
    }
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`icon-button notif-button ${light ? 'light' : ''}`}
        aria-label={t('notifications.title')}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
      >
        <Bell size={19} />
        {unread > 0 && <span className="notif-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-popover">
          <div className="notif-head">
            <strong>{t('notifications.title')}</strong>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-button">
                <CheckCheck size={14} /> {t('action.markAllRead')}
              </button>
            )}
          </div>
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">{t('notifications.empty')}</div>
            ) : (
              items.slice(0, 12).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`notif-item ${item.read ? '' : 'unread'}`}
                  onClick={() => openItem(item)}
                >
                  <span className={`notif-icon notif-${item.type}`}>
                    {item.type === 'announcement' ? (
                      <Megaphone size={15} />
                    ) : (
                      <span className="notif-pulse" />
                    )}
                  </span>
                  <span className="notif-copy">
                    <span className="notif-title">{item.title}</span>
                    <span className="notif-body">{item.body}</span>
                    <span className="notif-time">
                      {timeAgo(item.createdAt, lang)}
                      {item.reference ? ` · ${item.reference}` : ''}
                    </span>
                  </span>
                  {!item.read && <span className="unread-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
