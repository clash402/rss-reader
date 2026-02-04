export const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconSparkle = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M8 1.5L9.2 6.8 14.5 8 9.2 9.2 8 14.5 6.8 9.2 1.5 8 6.8 6.8 8 1.5z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M3.5 9.5a4.5 4.5 0 0 0 7.4 2.7L12.5 12m0 0v2.5M12.5 12H10m2.5-5.5a4.5 4.5 0 0 0-7.4-2.7L3.5 4m0 0V1.5M3.5 4H6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconBookmark = ({ filled = false }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M4.5 2.5h7a.5.5 0 0 1 .5.5v10l-4-2.5-4 2.5v-10a.5.5 0 0 1 .5-.5z"
      stroke="currentColor"
      strokeWidth="1.2"
      fill={filled ? "currentColor" : "none"}
    />
  </svg>
);

export const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="m3.2 7 2.6 2.8 5-5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const IconDots = () => (
  <svg width="16" height="4" viewBox="0 0 16 4" fill="none" aria-hidden>
    <circle cx="2" cy="2" r="1" fill="currentColor" />
    <circle cx="8" cy="2" r="1" fill="currentColor" />
    <circle cx="14" cy="2" r="1" fill="currentColor" />
  </svg>
);
