type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "brand-logo-mark" }: BrandLogoProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="5" y="7" width="11" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.5 12h4M8.5 16h4M8.5 20h2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M17 16h3.5l2-2.25M20.5 16 17 18.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.5 12.5v7M26.5 12.5v7M23.5 16h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandWordmark() {
  return (
    <span className="brand-wordmark">
      <span className="brand-wordmark-read">Read</span>
      <span className="brand-wordmark-two">2</span>
      <span className="brand-wordmark-md">MD</span>
      <span className="brand-wordmark-studio"> Studio</span>
    </span>
  );
}
