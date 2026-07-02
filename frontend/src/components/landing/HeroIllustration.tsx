export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      role="img"
      aria-label="Ilustrasi keluarga Gradion"
    >
      <circle cx="200" cy="200" r="160" fill="#00C1B2" fillOpacity="0.08" />
      <circle cx="200" cy="200" r="120" fill="#00C1B2" fillOpacity="0.06" />
      {/* Parent */}
      <ellipse cx="175" cy="295" rx="65" ry="22" fill="#000" fillOpacity="0.15" />
      <path d="M128 258c0-38 24-66 52-66s52 28 52 66v42H128V258z" fill="#F97316" />
      <circle cx="180" cy="172" r="36" fill="#FDBA74" />
      <path
        d="M144 162c8-26 34-40 52-33 18 7 30 30 26 55-11-7-26-11-42-9-16 2-30 8-36-13z"
        fill="#92400E"
      />
      {/* Child */}
      <circle cx="248" cy="208" r="28" fill="#FDBA74" />
      <path
        d="M224 203c5-17 20-25 33-19 13 6 17 21 14 36-8-5-17-7-27-5-10 2-17 6-20-12z"
        fill="#78350F"
      />
      <path
        d="M218 242c11 17 33 26 52 20"
        stroke="#00C1B2"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="232" y="256" width="46" height="50" rx="10" fill="#00C1B2" />
      {/* Accent hearts */}
      <path
        d="M305 115c0-7 5-12 11-12s11 5 11 12c0 14-22 24-22 24s-22-10-22-24z"
        fill="#00C1B2"
        fillOpacity="0.45"
      />
      <path
        d="M92 148c0-5 3-9 7-9s7 4 7 9c0 9-14 16-14 16s-14-7-14-16z"
        fill="#FBBF24"
        fillOpacity="0.5"
      />
      {/* Small star echoing brand mark */}
      <path
        d="M318 88L319 91L322 91L319.5 93L320.5 96L318 94L315.5 96L316.5 93L314 91L317 91L318 88Z"
        fill="#FBBF24"
      />
    </svg>
  );
}
