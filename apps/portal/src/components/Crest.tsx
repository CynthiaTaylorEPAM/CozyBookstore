/** The shop's crest: an open book with griffin wings, on a shield. */
export function Crest({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 3 56 11v20c0 15-10 25-24 30C18 56 8 46 8 31V11z" fill="#3a2440" stroke="#d9a441" strokeWidth="3" />
      <path d="M17 26c5-4 10-4 15 0 5-4 10-4 15 0v17c-5-4-10-4-15 0-5-4-10-4-15 0z" fill="#f6ecd9" />
      <path d="M32 26v17" stroke="#3a2440" strokeWidth="2" />
      <path
        d="M17 24c-5-6-5-11-2-15 2 5 6 8 12 9M47 24c5-6 5-11 2-15-2 5-6 8-12 9"
        fill="none"
        stroke="#d9a441"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
