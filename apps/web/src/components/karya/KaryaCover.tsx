'use client';

import React from 'react';

interface KaryaCoverProps {
  src: string | null;
  alt: string;
  initials?: string;
}

export function KaryaCover({ src, alt, initials }: KaryaCoverProps) {
  return (
    <div className="relative aspect-[3/4] bg-surface-1 border border-hairline rounded-none overflow-hidden">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
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
