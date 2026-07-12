'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';

// ============================================================
// The Poem
// ============================================================

const POEM_LINES = [
  'Every story deserves to shine,',
  'Written with purpose, forever yours.',
  'On Jingga, words become legacy,',
  'Paid instantly, without barriers.',
  '',
  'Create without limits,',
  'Own every chapter you write.',
  'From Southeast Asia to the world,',
  'Your voice begins its flight.',
];

const LINE_INTERVAL = 160;
const INITIAL_DELAY = 300;

// ============================================================
// Component
// ============================================================

export function PoetryBanner() {
  const [visibleLines, setVisibleLines] = useState<number>(0);

  const dots = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 2,
      })),
    [],
  );

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    POEM_LINES.forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleLines((prev) => Math.max(prev, i + 1));
      }, INITIAL_DELAY + i * LINE_INTERVAL);
      timers.push(t);
    });
    timersRef.current = timers;

    return () => {
      timers.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const isAllVisible = visibleLines >= POEM_LINES.length;

  return (
    <div className="relative bg-canvas border border-hairline p-xl lg:p-xxl min-h-[380px] overflow-hidden group transition-all duration-300 hover:shadow-[0_0_24px_-4px_rgba(15,98,254,0.15)] hover:border-primary/30 hover:scale-[1.01]">
      {/* Black dot field */}
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute rounded-full bg-ink/20 pointer-events-none"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            animation: `twinkle ${dot.duration}s ease-in-out ${dot.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* Top & bottom hairlines */}
      <div className="absolute top-0 left-8 right-8 h-px bg-hairline" />
      <div className="absolute bottom-0 left-8 right-8 h-px bg-hairline" />

      {/* Content */}
      <div className="relative z-10">
        <div className="space-y-1">
          {POEM_LINES.map((line, i) => {
            if (!line) {
              return (
                <div
                  key={`spacer-${i}`}
                  className={`h-4 transition-all duration-500 ${
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
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                <span
                  className={`text-body leading-relaxed ${
                    line.includes('Jingga')
                      ? 'text-ink font-medium'
                      : 'text-ink-muted'
                  }`}
                >
                  {line}
                </span>
              </p>
            );
          })}
        </div>

        {isAllVisible && (
          <div className="mt-lg flex items-center gap-sm text-body-sm text-ink-subtle animate-fade-in">
            <span className="w-8 h-px bg-hairline-strong/30" />
            <span className="font-mono text-caption tracking-wider">&mdash; Jingga</span>
            <span className="w-8 h-px bg-hairline-strong/30" />
          </div>
        )}
      </div>
    </div>
  );
}
