import React from 'react';

interface UtilityBarProps {
  network?: string;
  balance?: string;
  className?: string;
}

export function UtilityBar({ network = 'testnet', balance, className = '' }: UtilityBarProps) {
  return (
    <div
      className={[
        'bg-surface-1 py-xxs px-lg text-caption text-ink-muted hidden md:block',
        className,
      ].join(' ')}
    >
      <div className="mx-auto max-w-[1584px] flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-semantic-success" />
          <span>Stellar {network}</span>
        </div>
        {balance && <span>{balance}</span>}
      </div>
    </div>
  );
}
