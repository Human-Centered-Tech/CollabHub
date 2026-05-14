interface PolarBearLogoProps {
  className?: string;
}

export function PolarBearLogo({ className }: PolarBearLogoProps) {
  return (
    <svg
      viewBox="0 0 96 56"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="#fafafa"
      aria-hidden="true"
    >
      <ellipse cx="44" cy="28" rx="33" ry="10" />
      <circle cx="12" cy="26" r="2.5" />
      <ellipse cx="76" cy="22" rx="14" ry="10" />
      <ellipse cx="88" cy="26" rx="6" ry="4" />
      <ellipse cx="71" cy="12" rx="3.5" ry="3" />
      <rect x="62" y="34" width="9" height="18" rx="3" />
      <rect x="18" y="34" width="9" height="18" rx="3" />
    </svg>
  );
}
