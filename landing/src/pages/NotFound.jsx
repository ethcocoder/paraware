import { Link } from 'react-router-dom';
import { ArrowLeft, MapPinOff } from 'lucide-react';
import { Brand } from '../components/Brand';
import { useLanguage } from '../i18n';
import { useDocumentTitle } from '../hooks';

export default function NotFound() {
  const { t } = useLanguage();
  useDocumentTitle('Page not found');
  return (
    <div className="not-found-page">
      <Link to="/" className="not-found-brand"><Brand size={42} /></Link>
      <div className="not-found-card">
        <span className="not-found-icon"><MapPinOff size={34} /></span>
        <span className="eyebrow">404</span>
        <h1>{t('error.notFound')}</h1>
        <p>{t('error.notFoundDesc')}</p>
        <Link to="/" className="button button-primary">
          <ArrowLeft size={17} /> {t('error.goHome')}
        </Link>
      </div>
    </div>
  );
}
