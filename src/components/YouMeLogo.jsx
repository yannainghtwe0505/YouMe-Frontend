import React from 'react';

/**
 * YouMe brand mark — used on auth / language screens and matches public/youme-icon.svg.
 */
export default function YouMeLogo({ size = 72, className = '', showWordmark = false }) {
  return (
    <div className={`youme-logo-wrap ${className}`.trim()} style={{ textAlign: 'center' }}>
      <img
        src="/youme-icon.svg"
        alt="YouMe"
        width={size}
        height={size}
        className="youme-logo"
        draggable={false}
      />
      {showWordmark ? (
        <span className="youme-logo-wordmark" aria-hidden>
          YouMe
        </span>
      ) : null}
    </div>
  );
}
