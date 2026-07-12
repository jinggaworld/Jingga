'use client';

import React from 'react';

interface KaryaCoverProps {
  src: string | null;
  alt: string;
  initials?: string;
}

export function KaryaCover({ src, alt, initials }: KaryaCoverProps) {
  return (
    <div
      className="
        relative aspect-[3/4] bg-surface-1
        border border-hairline overflow-hidden
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        hover:scale-[1.02]
        group
      "
    >
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-2">
          <span className="text-display-lg text-ink-subtle/20 font-light">
            {initials || alt.charAt(0)}
          </span>
        </div>
      )}
    </div>
  );
}
