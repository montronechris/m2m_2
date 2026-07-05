interface BookLogoProps {
  className?: string;
  ariaLabel?: string;
}

export function BookLogo({ className, ariaLabel }: BookLogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={ariaLabel ?? "Logo: libro aperto con ramo d'ulivo"}
    >
      <defs>
        <linearGradient id="bookGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8C984" />
          <stop offset="55%" stopColor="#C9A24B" />
          <stop offset="100%" stopColor="#A47A2E" />
        </linearGradient>
        <linearGradient id="pageGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBEFC9" />
          <stop offset="100%" stopColor="#E7CE8A" />
        </linearGradient>
        <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8FAE5C" />
          <stop offset="100%" stopColor="#5E7E34" />
        </linearGradient>
      </defs>
      <g>
        <path d="M60 14 C 58 26, 57 36, 60 48" stroke="#6E5326" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M59 22 C 50 19, 44 22, 42 28 C 50 30, 56 28, 60 24 Z" fill="url(#leafGrad)" />
        <path d="M58 31 C 48 29, 41 33, 39 39 C 49 41, 56 38, 59 34 Z" fill="url(#leafGrad)" />
        <path d="M58 40 C 49 39, 43 43, 41 49 C 51 50, 57 47, 59 43 Z" fill="url(#leafGrad)" />
        <path d="M61 22 C 70 19, 76 22, 78 28 C 70 30, 64 28, 60 24 Z" fill="url(#leafGrad)" />
        <path d="M62 31 C 72 29, 79 33, 81 39 C 71 41, 64 38, 61 34 Z" fill="url(#leafGrad)" />
        <path d="M62 40 C 71 39, 77 43, 79 49 C 69 50, 63 47, 61 43 Z" fill="url(#leafGrad)" />
        <circle cx="49" cy="37" r="1.8" fill="#3C2A12" />
        <circle cx="71" cy="37" r="1.8" fill="#3C2A12" />
      </g>
      <path d="M22 62 C 34 56, 48 56, 60 62 C 72 56, 86 56, 98 62 L 98 100 C 86 94, 72 94, 60 100 C 48 94, 34 94, 22 100 Z" fill="url(#bookGold)" stroke="#7A5A22" strokeWidth="1.4" />
      <path d="M60 62 C 48 56, 34 56, 22 62 L 22 100 C 34 94, 48 94, 60 100 Z" fill="url(#pageGrad)" />
      <path d="M60 62 C 72 56, 86 56, 98 62 L 98 100 C 86 94, 72 94, 60 100 Z" fill="url(#pageGrad)" />
      <path d="M60 62 L 60 100" stroke="#7A5A22" strokeWidth="1.6" strokeLinecap="round" />
      <g stroke="#9C7A33" strokeWidth="0.8" strokeLinecap="round" opacity="0.7">
        <path d="M30 70 L 52 66" />
        <path d="M30 77 L 52 73" />
        <path d="M30 84 L 52 80" />
        <path d="M68 66 L 90 70" />
        <path d="M68 73 L 90 77" />
        <path d="M68 80 L 90 84" />
      </g>
    </svg>
  );
}
