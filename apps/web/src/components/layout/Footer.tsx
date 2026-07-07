import React from 'react';

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

interface FooterProps {
  columns?: FooterColumn[];
  className?: string;
}

export function Footer({ columns, className = '' }: FooterProps) {
  const defaultColumns: FooterColumn[] = [
    {
      title: 'Platform',
      links: [
        { label: 'Marketplace', href: '/marketplace' },
        { label: 'Upload Work', href: '/upload' },
        { label: 'Dashboard', href: '/dashboard' },
      ],
    },
    {
      title: 'For Writers',
      links: [
        { label: 'How to Publish', href: '#' },
        { label: 'Royalties', href: '#' },
        { label: 'Collaboration', href: '#' },
      ],
    },
    {
      title: 'For Readers',
      links: [
        { label: 'How to Buy', href: '#' },
        { label: 'My Collection', href: '/reader' },
      ],
    },
    {
      title: 'Developers',
      links: [
        { label: 'Stellar Docs', href: 'https://developers.stellar.org' },
        { label: 'Soroban Docs', href: 'https://soroban.stellar.org' },
      ],
    },
    {
      title: 'About',
      links: [
        { label: 'APAC Hackathon 2026', href: '#' },
        { label: 'RWA Track', href: '#' },
      ],
    },
  ];

  const cols = columns || defaultColumns;

  return (
    <footer className={['bg-inverse-canvas text-inverse-ink-muted', className].join(' ')}>
      <div className="mx-auto max-w-[1584px] px-lg py-xxl">
        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-xl mb-xl">
          {cols.map((col) => (
            <div key={col.title}>
              <h3 className="text-body-emphasis text-inverse-ink mb-md">{col.title}</h3>
              <ul className="space-y-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-body-sm hover:text-inverse-ink transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-inverse-surface-1 pt-lg flex flex-col md:flex-row items-center justify-between gap-md">
          <span className="text-caption">© 2026 Jingga. Built on Stellar.</span>
          <div className="flex gap-md text-caption">
            <a href="#" className="hover:text-inverse-ink transition-colors">Terms</a>
            <a href="#" className="hover:text-inverse-ink transition-colors">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
