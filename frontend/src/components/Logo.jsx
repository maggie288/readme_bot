export default function Logo({ className = "h-7 w-7" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Book icon */}
      <g>
        {/* Book spine */}
        <rect x="4" y="4" width="3" height="24" rx="1" fill="currentColor" />
        {/* Book pages */}
        <path
          d="M7 6C7 4.89543 7.89543 4 9 4H24C25.1046 4 26 4.89543 26 6V26C26 27.1046 25.1046 28 24 28H9C7.89543 28 7 27.1046 7 26V6Z"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="2"
        />
        {/* Page lines */}
        <line x1="11" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="18" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Bot eye */}
        <circle cx="21" cy="22" r="2.5" fill="currentColor" />
        <circle cx="21" cy="21.5" r="1" fill="white" />
      </g>
    </svg>
  );
}
