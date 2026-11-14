export function LogoMark({ size = 40, tone = 'green' }) {
  const bg = tone === 'light' ? '#F7F3EA' : '#123B2A';
  const fg = tone === 'light' ? '#123B2A' : '#F4B942';
  const dot = tone === 'light' ? '#D97745' : '#E7F1D8';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Paraware"
      className="logo-mark"
    >
      <rect width="64" height="64" rx="18" fill={bg} />
      <path
        d="M18 17h18.5c8 0 13.5 4.4 13.5 11.4 0 7.2-5.6 11.8-13.9 11.8H28v8.3h-10V17Zm10 8.3v7.1h7.2c2.8 0 4.5-1.3 4.5-3.6s-1.7-3.5-4.5-3.5H28Z"
        fill={fg}
      />
      <circle cx="47" cy="48" r="5" fill={dot} />
    </svg>
  );
}

export function Brand({ light = false, compact = false, size = 38 }) {
  return (
    <span className={`brand ${light ? 'brand-light' : ''} ${compact ? 'brand-compact' : ''}`}>
      <LogoMark size={size} tone={light ? 'light' : 'green'} />
      {!compact && (
        <span className="brand-copy">
          <span className="brand-name">paraware</span>
          <span className="brand-sub">Woreda 04</span>
        </span>
      )}
    </span>
  );
}

export function Avatar({ name = '', size = 36, tone = 0 }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const tones = ['#DCEBCF', '#F7E1C8', '#DCE8F2', '#F3DCD8', '#EADFF1'];
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: tones[tone % tones.length],
        fontSize: size * 0.36,
      }}
      aria-hidden="true"
    >
      {initials || 'P'}
    </span>
  );
}
