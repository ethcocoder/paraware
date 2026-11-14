import { Globe2 } from 'lucide-react';
import { LANGUAGES, useLanguage } from '../i18n';

export function LanguageSwitcher({ light = false }) {
  const { lang, setLang } = useLanguage();
  return (
    <label className={`language-switcher ${light ? 'light' : ''}`}>
      <Globe2 size={16} />
      <span className="sr-only">Language</span>
      <select value={lang} onChange={(event) => setLang(event.target.value)}>
        {LANGUAGES.map((language) => (
          <option key={language.id} value={language.id}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
