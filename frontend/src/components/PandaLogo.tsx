interface PandaLogoProps {
  className?: string;
}

export function PandaLogo({ className }: PandaLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#fafafa" />
      <circle cx="17" cy="18" r="8.5" fill="#0c1024" />
      <circle cx="47" cy="18" r="8.5" fill="#0c1024" />
      <ellipse
        cx="24"
        cy="32"
        rx="4.5"
        ry="6.5"
        transform="rotate(-18 24 32)"
        fill="#0c1024"
      />
      <ellipse
        cx="40"
        cy="32"
        rx="4.5"
        ry="6.5"
        transform="rotate(18 40 32)"
        fill="#0c1024"
      />
      <circle cx="24" cy="32" r="1.3" fill="#fafafa" />
      <circle cx="40" cy="32" r="1.3" fill="#fafafa" />
      <ellipse cx="32" cy="40" rx="2.6" ry="2" fill="#0c1024" />
      <path
        d="M32 42 L32 45"
        stroke="#0c1024"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M32 45 Q28.5 47.5 27 45.5"
        stroke="#0c1024"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M32 45 Q35.5 47.5 37 45.5"
        stroke="#0c1024"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
