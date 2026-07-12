'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';

// ============================================================
// The Poem
// ============================================================

const POEM_TITLE = 'Where Stories Find Their Home';

const POEM_LINES = [
  'Every word begins with quiet light,',
  'A spark that dares to shape the night.',
  'On Jingga, every voice can rise,',
  'Beyond the limits, beyond disguise.',
  '',
  'No waiting hands, no hidden walls,',
  'Your work is yours when inspiration calls.',
  'With every page and every line,',
  'Your worth is written, clear as time.',
  '',
  'Built on trust, secured by stars,',
  'Where every dream can travel far.',
  'Royalties flow with honest grace,',
  'Rewarding every heart\'s embrace.',
  '',
  'So write, create, and boldly stand,',
  'Let every story cross the land.',
  'From Southeast Asia to skies anew,',
  'Jingga begins its journey with you.',
];

const LINE_INTERVAL = 180;
const INITIAL_DELAY = 400;

// ============================================================
// Component
// ============================================================

export function PoetryBanner() {
  const [visibleLines, setVisibleLines] = useState<number>(0);

  // Stable star positions (memoized, won't jump on HMR)
  const stars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 2,
      })),
    [],
  );

  // Track all timers (initial + replay) for proper cleanup on unmount
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scheduleLines = useRef((startDelay: number) => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    POEM_LINES.forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleLines((prev) => Math.max(prev, i + 1));
      }, startDelay + i * LINE_INTERVAL);
      timers.push(t);
    });
    timersRef.current.push(...timers);
  });

  // Initial animation on mount
  useEffect(() => {
    scheduleLines.current(INITIAL_DELAY);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const isAllVisible = visibleLines >= POEM_LINES.length;

  const handleReplay = () => {
    // Clear any pending timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setVisibleLines(0);

    // Start new sequence after a brief reset delay
    const resetTimer = setTimeout(() => {
      scheduleLines.current(INITIAL_DELAY);
    }, 300);
    timersRef.current.push(resetTimer);
  };

  return (
    <div className="relative bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] border border-[#312e81]/50 p-xl lg:p-xxl min-h-[450px] overflow-hidden">
      {/* Star field */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: isAllVisible ? 0.8 : 0.3,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite alternate`,
            transition: 'opacity 1s ease',
          }}
        />
      ))}

      {/* Subtle glow orbs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Corner decorative lines */}
      <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
      <div className="absolute top-0 left-0 w-px h-16 bg-gradient-to-b from-transparent via-indigo-400/60 to-transparent" />
      <div className="absolute bottom-0 right-0 w-16 h-px bg-gradient-to-l from-transparent via-indigo-400/60 to-transparent" />
      <div className="absolute bottom-0 right-0 w-px h-16 bg-gradient-to-t from-transparent via-indigo-400/60 to-transparent" />

      {/* Content */}
      <div className="relative z-10">
        {/* Title */}
        <div
          className={`mb-lg transition-all duration-700 ${
            visibleLines > 0
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <h3 className="text-body-sm font-medium tracking-[0.15em] uppercase text-indigo-300/80 mb-sm">
            A Poem for Creators
          </h3>
          <h2 className="text-headline text-white/90 font-light italic leading-tight">
            &ldquo;{POEM_TITLE}&rdquo;
          </h2>
        </div>

        {/* Poem lines */}
        <div className="space-y-1">
          {POEM_LINES.map((line, i) => {
            if (!line) {
              // Empty line = stanza break
              return (
                <div
                  key={`spacer-${i}`}
                  className={`h-3 transition-all duration-500 ${
                    i < visibleLines ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              );
            }

            return (
              <p
                key={`line-${i}`}
                className={`transition-all duration-700 ease-out ${
                  i < visibleLines
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-3'
                }`}
                style={{
                  transitionDelay: `${i * 50}ms`,
                }}
              >
                <span
                  className={`text-body leading-relaxed ${
                    line.includes('Jingga')
                      ? 'text-indigo-300 font-medium'
                      : 'text-white/70'
                  }`}
                >
                  {line}
                </span>
              </p>
            );
          })}
        </div>

        {/* Finished indicator */}
        {isAllVisible && (
          <div className="mt-lg flex items-center gap-sm text-body-sm text-indigo-300/60 animate-fade-in">
            <span className="w-6 h-px bg-indigo-400/40" />
            <span className="italic">&mdash; Jingga</span>
            <span className="w-6 h-px bg-indigo-400/40" />
          </div>
        )}

        {/* Replay button */}
        {isAllVisible && (
          <button
            onClick={handleReplay}
            className="mt-md text-caption text-white/30 hover:text-indigo-300/60 transition-colors"
          >
            &#x21bb; Replay
          </button>
        )}
      </div>
    </div>
  );
}
