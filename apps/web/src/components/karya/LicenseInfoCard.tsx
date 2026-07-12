'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { API_BASE } from '@/lib/api';

interface LicenseInfoCardProps {
  karyaId: string;
  issuerWallet: string;
  userWallet?: string | null;
  isOwner: boolean;
}

interface LicensesResponse {
  licenses: Array<{
    id: string;
    license_type: string;
    territory: string;
    duration: string;
    status: string;
    license_fee: number;
    issued_at: string;
    purchaser_wallet: string;
  }>;
  total_licenses: number;
  total_revenue: number;
}

export function LicenseInfoCard({ karyaId, issuerWallet, userWallet, isOwner }: LicenseInfoCardProps) {
  const [data, setData] = useState<LicensesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/licenses/karya/${karyaId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [karyaId]);

  if (loading) {
    return (
      <div className="bg-canvas border border-hairline p-lg rounded-none">
        <div className="flex items-center gap-sm">
          <Spinner size="sm" />
          <span className="text-body-sm text-ink-muted">Checking license availability...</span>
        </div>
      </div>
    );
  }

  // Check if user already holds a license
  const userLicense = data?.licenses?.find(
    (l) => l.purchaser_wallet === userWallet && l.status === 'active'
  );

  const activeLicenseCount = data?.licenses?.filter((l) => l.status === 'active').length || 0;
  const hasExclusive = data?.licenses?.some((l) => l.license_type === 'exclusive' && l.status === 'active');

  return (
    <div className="bg-canvas border border-hairline p-lg rounded-none">
      <div className="flex items-center justify-between mb-md">
        <h3 className="text-card-title text-ink">Licenses</h3>
        <Badge variant="info">
          {data?.total_licenses || 0} {data?.total_licenses === 1 ? 'license' : 'licenses'}
        </Badge>
      </div>

      {userLicense ? (
        /* User already holds a license */
        <div className="bg-semantic-success/5 border border-semantic-success/20 p-md mb-md">
          <div className="flex items-center gap-xs mb-sm">
            <svg className="w-4 h-4 text-semantic-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-body-sm font-medium text-semantic-success">You hold a license</span>
          </div>
          <p className="text-body-sm text-ink-muted">
            {userLicense.license_type === 'exclusive' ? 'Exclusive' : 'Non-Exclusive'} &middot;{' '}
            {userLicense.territory} &middot;{' '}
            {userLicense.duration === 'perpetual' ? 'Perpetual' : userLicense.duration}
          </p>
        </div>
      ) : isOwner ? (
        /* Owner can't buy license but can see info */
        <div className="bg-surface-1 border border-hairline p-md mb-md">
          <p className="text-body-sm text-ink-muted">You are the original author of this work.</p>
          <p className="text-body-sm text-ink-muted mt-xs">
            Other users can purchase licenses to distribute or resell your work.
          </p>
        </div>
      ) : (
        /* Can purchase a license */
        <div className="space-y-sm mb-md">
          <div className="flex items-center gap-xs">
            <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-body-sm text-ink">
              {hasExclusive
                ? 'An exclusive license has been purchased for this work'
                : 'Licenses available for this work'}
            </span>
          </div>

          {activeLicenseCount > 0 && (
            <div className="text-body-sm text-ink-subtle">
              {activeLicenseCount} active {activeLicenseCount === 1 ? 'license' : 'licenses'}
            </div>
          )}

          {hasExclusive && (
            <p className="text-body-sm text-semantic-warning">
              Only non-exclusive licenses are available.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {!userLicense && !isOwner && (
        <Link
          href={`/karya/${karyaId}/license`}
          className="inline-flex items-center justify-center w-full px-lg py-sm bg-primary text-on-primary text-button hover:bg-primary-hover transition-colors"
        >
          Purchase License
        </Link>
      )}

      {userLicense && (
        <Link
          href={`/karya/${karyaId}/license`}
          className="inline-flex items-center justify-center w-full px-lg py-sm border border-hairline text-ink text-button hover:bg-surface-1 transition-colors"
        >
          View License Details
        </Link>
      )}

      {isOwner && data && data.total_licenses > 0 && (
        <Link
          href={`/karya/${karyaId}/license`}
          className="inline-flex items-center justify-center w-full px-lg py-sm border border-hairline text-ink text-button hover:bg-surface-1 transition-colors"
        >
          View All Licenses ({data.total_licenses})
        </Link>
      )}
    </div>
  );
}
