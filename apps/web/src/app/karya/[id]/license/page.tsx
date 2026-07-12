'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';
import { signTransaction as freighterSign } from '@/lib/freighter';

// ============================================================
// Types
// ============================================================

type LicenseType = 'exclusive' | 'non-exclusive';
type LicenseDuration = 'perpetual' | '1year' | '5years';

interface KaryaInfo {
  id: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: number;
  cover_image_url: string | null;
  issuer_wallet: string;
  issuer_name: string;
  stellar_asset_code: string;
}

interface LicenseRecord {
  id: string;
  purchaser_wallet: string;
  original_author_wallet: string;
  license_type: string;
  territory: string;
  duration: string;
  resale_percentage: number;
  license_fee: number;
  status: string;
  issued_at: string;
  expires_at: string | null;
  resale_count: number;
  total_resale_volume: number;
}

interface LicensesResponse {
  licenses: LicenseRecord[];
  total_licenses: number;
  total_revenue: number;
}

type PurchaseState = 'idle' | 'initiating' | 'signing' | 'confirming' | 'success' | 'error';

// ============================================================
// Constants
// ============================================================

const TERRITORY_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'SEA', label: 'Southeast Asia (SEA)' },
  { value: 'AS', label: 'Asia' },
  { value: 'US', label: 'United States' },
  { value: 'EU', label: 'Europe' },
  { value: 'ID', label: 'Indonesia' },
];

const DURATION_OPTIONS: { value: LicenseDuration; label: string; description: string }[] = [
  { value: 'perpetual', label: 'Perpetual', description: 'No expiry' },
  { value: '5years', label: '5 Years', description: 'Expires in 5 years' },
  { value: '1year', label: '1 Year', description: 'Expires in 1 year' },
];

// ============================================================
// Component
// ============================================================

export default function LicensePage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected, isConnecting: authLoading, isFreighterAvailable, connectFreighter, walletAddress } = useAuth();

  // Karya state
  const [karya, setKarya] = useState<KaryaInfo | null>(null);
  const [karyaLoading, setKaryaLoading] = useState(true);

  // Licenses state
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [totalLicenses, setTotalLicenses] = useState(0);
  const [licensesLoading, setLicensesLoading] = useState(true);

  // Form state
  const [licenseType, setLicenseType] = useState<LicenseType>('non-exclusive');
  const [territory, setTerritory] = useState('global');
  const [duration, setDuration] = useState<LicenseDuration>('perpetual');

  // Purchase state
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseResult, setPurchaseResult] = useState<{
    license_id: string;
    tx_hash: string;
    license_fee: number;
    explorer_url: string;
  } | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'purchase' | 'existing'>('purchase');

  const karyaId = params.id as string;
  const isOwner = karya?.issuer_wallet === walletAddress;
  const licenseFee = karya ? karya.harga * 5 : 0;

  // ============================================================
  // Data Fetching
  // ============================================================

  useEffect(() => {
    if (!karyaId) return;

    // Fetch karya info
    fetch(`${API_BASE}/api/v1/karya/${karyaId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setKarya(data?.karya || null))
      .catch(() => setKarya(null))
      .finally(() => setKaryaLoading(false));

    // Fetch licenses
    fetch(`${API_BASE}/api/v1/licenses/karya/${karyaId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLicenses(data.licenses || []);
          setTotalLicenses(data.total_licenses || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLicensesLoading(false));
  }, [karyaId]);

  // ============================================================
  // Purchase Flow
  // ============================================================

  const handlePurchase = async () => {
    setPurchaseState('initiating');
    setPurchaseError('');

    try {
      const token = localStorage.getItem('jingga_auth_token');

      // Step 1: Initiate license purchase
      const initiateRes = await fetch(`${API_BASE}/api/v1/licenses/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        } as HeadersInit,
        body: JSON.stringify({
          karya_id: karyaId,
          license_type: licenseType,
          territory,
          duration,
        }),
      });

      if (!initiateRes.ok) {
        const errData = await initiateRes.json();
        throw new Error(errData.error || 'Failed to initiate license purchase');
      }

      const { xdr } = await initiateRes.json();

      // Step 2: Sign with Freighter
      setPurchaseState('signing');

      const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'public'
        ? 'Public Global Stellar Network ; September 2015'
        : 'Test SDF Network ; September 2015';

      const signedXdr = await freighterSign(xdr, networkPassphrase);

      // Step 3: Confirm license purchase
      setPurchaseState('confirming');

      const confirmRes = await fetch(`${API_BASE}/api/v1/licenses/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        } as HeadersInit,
        body: JSON.stringify({
          signed_xdr: signedXdr,
          karya_id: karyaId,
          license_type: licenseType,
          territory,
          duration,
        }),
      });

      if (!confirmRes.ok) {
        const errData = await confirmRes.json();
        throw new Error(errData.error || 'Failed to confirm license purchase');
      }

      const result = await confirmRes.json();
      setPurchaseResult(result);
      setPurchaseState('success');

      // Refresh licenses
      const updatedLicenses = await fetch(`${API_BASE}/api/v1/licenses/karya/${karyaId}`)
        .then((r) => (r.ok ? r.json() : null));
      if (updatedLicenses) {
        setLicenses(updatedLicenses.licenses || []);
        setTotalLicenses(updatedLicenses.total_licenses || 0);
      }
    } catch (err: any) {
      console.error('[LicensePage] Purchase error:', err);
      setPurchaseError(err.message || 'License purchase failed');
      setPurchaseState('error');
    }
  };

  // ============================================================
  // Auth Gate
  // ============================================================

  if (authLoading || karyaLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!karya) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-lg">
          <div className="text-center">
            <h1 className="text-headline text-ink mb-md">Work Not Found</h1>
            <p className="text-body text-ink-muted mb-lg">This work does not exist or has been archived.</p>
            <Link href="/marketplace" className="text-primary hover:underline">Back to Marketplace</Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isConnected) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-lg">
          <div className="bg-canvas border border-hairline p-xl max-w-md text-center">
            <h1 className="text-headline text-ink mb-md">Connect Wallet</h1>
            <p className="text-body text-ink-muted mb-lg">
              Connect your Stellar wallet to purchase a license
            </p>
            {isFreighterAvailable ? (
              <button
                onClick={connectFreighter}
                className="w-full bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors mb-md"
              >
                Connect Freighter Wallet
              </button>
            ) : (
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-block bg-surface-1 text-ink text-button py-sm px-md rounded-none hover:bg-surface-2 transition-colors border border-hairline"
              >
                Install Freighter Extension
              </a>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <Layout>
      <div className="mx-auto max-w-[1200px] py-xl px-lg">
        {/* Back link */}
        <Link
          href={`/karya/${karyaId}`}
          className="inline-flex items-center gap-xs text-body-sm text-ink-muted hover:text-ink transition-colors mb-lg"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Back to work details
        </Link>

        {/* Header */}
        <div className="mb-xl">
          <h1 className="text-display-md text-ink mb-sm">License Management</h1>
          <p className="text-body-lg text-ink-muted">
            Purchase and manage licenses for <strong className="text-ink">{karya.judul}</strong>
          </p>
        </div>

        {/* Karya Summary Card */}
        <div className="bg-surface-1 border border-hairline p-lg mb-xl">
          <div className="flex items-center gap-lg">
            {/* Mini cover */}
            <div className="w-16 h-20 bg-surface-2 border border-hairline flex items-center justify-center flex-shrink-0">
              {karya.cover_image_url ? (
                <img src={karya.cover_image_url} alt={karya.judul} className="w-full h-full object-cover" />
              ) : (
                <span className="text-caption text-ink-subtle">{karya.judul.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-card-title text-ink truncate">{karya.judul}</h2>
              <p className="text-body-sm text-ink-muted">
                by {karya.issuer_name} &middot;{' '}
                <Badge variant="info">
                  {karya.kategori === 'fiksi' ? 'Fiction' : 
                   karya.kategori === 'paper' ? 'Paper' :
                   karya.kategori === 'puisi' ? 'Poetry' : 'Non-Fiction'}
                </Badge>
              </p>
              <p className="text-body-sm text-ink-subtle mt-xs">
                Asset: {karya.stellar_asset_code} &middot; Author: {truncateAddress(karya.issuer_wallet, 6)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-body-sm text-ink-muted">Base price</p>
              <p className="text-headline text-primary">{karya.harga} XLM</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-hairline mb-xl">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab('purchase')}
              className={`px-lg py-md text-body-sm transition-colors border-b-2 ${
                activeTab === 'purchase'
                  ? 'border-primary text-ink font-medium'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              Purchase License
            </button>
            <button
              onClick={() => setActiveTab('existing')}
              className={`px-lg py-md text-body-sm transition-colors border-b-2 ${
                activeTab === 'existing'
                  ? 'border-primary text-ink font-medium'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              Existing Licenses ({totalLicenses})
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PURCHASE TAB */}
        {/* ============================================================ */}
        {activeTab === 'purchase' && (
          <>
            {isOwner ? (
              <div className="bg-canvas border border-hairline p-xl text-center">
                <div className="w-16 h-16 bg-surface-1 flex items-center justify-center mx-auto mb-md">
                  <svg className="w-8 h-8 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-card-title text-ink mb-sm">You Own This Work</h2>
                <p className="text-body text-ink-muted mb-lg">
                  As the original author, you automatically hold all rights.
                  Other users can purchase licenses from you.
                </p>
                <div className="bg-surface-1 border border-hairline p-md inline-block text-left">
                  <p className="text-body-sm text-ink mb-xs">License revenue so far:</p>
                  <p className="text-display-md text-primary">{totalLicenses} license{totalLicenses !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Success State */}
                {purchaseState === 'success' && purchaseResult && (
                  <div className="bg-canvas border border-hairline p-xl mb-xl">
                    <div className="flex items-center gap-md mb-lg">
                      <div className="w-12 h-12 bg-semantic-success/10 flex items-center justify-center">
                        <svg className="w-7 h-7 text-semantic-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-card-title text-ink">License Purchased Successfully!</h2>
                        <p className="text-body-sm text-ink-muted">
                          Your {licenseType === 'exclusive' ? 'exclusive' : 'non-exclusive'} license is now active
                        </p>
                      </div>
                    </div>

                    <div className="bg-surface-1 p-md space-y-sm mb-lg">
                      <div className="flex justify-between text-body-sm">
                        <span className="text-ink-muted">License ID</span>
                        <span className="text-ink font-mono text-xs">{purchaseResult.license_id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between text-body-sm">
                        <span className="text-ink-muted">Tx Hash</span>
                        <a
                          href={purchaseResult.explorer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          {purchaseResult.tx_hash.slice(0, 16)}...
                        </a>
                      </div>
                      <div className="flex justify-between text-body-sm">
                        <span className="text-ink-muted">Fee Paid</span>
                        <span className="text-ink font-medium">{purchaseResult.license_fee} XLM</span>
                      </div>
                    </div>

                    <div className="flex gap-md">
                      <a
                        href={purchaseResult.explorer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-lg py-md bg-primary text-on-primary text-body text-center hover:bg-primary-hover transition-colors"
                      >
                        View on Stellar Explorer
                      </a>
                      <button
                        onClick={() => setActiveTab('existing')}
                        className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
                      >
                        View My Licenses
                      </button>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {purchaseState === 'error' && (
                  <div className="bg-canvas border border-semantic-error p-xl mb-xl">
                    <div className="flex items-center gap-md mb-lg">
                      <div className="w-10 h-10 bg-semantic-error/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-semantic-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-card-title text-ink">Purchase Failed</h3>
                        <p className="text-body-sm text-ink-muted">{purchaseError}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setPurchaseState('idle'); setPurchaseError(''); }}
                      className="px-lg py-md bg-primary text-on-primary text-body hover:bg-primary-hover transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Loading States */}
                {(purchaseState === 'initiating' || purchaseState === 'signing' || purchaseState === 'confirming') && (
                  <div className="bg-canvas border border-hairline p-xl mb-xl">
                    <div className="flex items-center gap-md">
                      <Spinner size="md" />
                      <div>
                        <h3 className="text-card-title text-ink">
                          {purchaseState === 'initiating' && 'Preparing license...'}
                          {purchaseState === 'signing' && 'Waiting for wallet confirmation...'}
                          {purchaseState === 'confirming' && 'Processing payment...'}
                        </h3>
                        <p className="text-body-sm text-ink-muted">
                          {purchaseState === 'signing' && 'Freighter popup opened in browser'}
                          {purchaseState === 'confirming' && 'Transaction submitted to Stellar network'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Purchase Form */}
                {purchaseState === 'idle' && (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-xl">
                    {/* Form */}
                    <div className="lg:col-span-3">
                      <div className="bg-canvas border border-hairline p-xl">
                        <h2 className="text-card-title text-ink mb-lg">License Configuration</h2>

                        {/* License Type */}
                        <div className="mb-lg">
                          <label className="block text-body-sm text-ink-muted mb-sm">License Type</label>
                          <div className="grid grid-cols-2 gap-md">
                            <button
                              onClick={() => setLicenseType('non-exclusive')}
                              className={`p-lg border text-left transition-colors ${
                                licenseType === 'non-exclusive'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-hairline hover:bg-surface-1'
                              }`}
                            >
                              <div className="flex items-center gap-sm mb-sm">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  licenseType === 'non-exclusive' ? 'border-primary' : 'border-hairline-strong'
                                }`}>
                                  {licenseType === 'non-exclusive' && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <span className="text-body font-medium text-ink">Non-Exclusive</span>
                              </div>
                              <p className="text-body-sm text-ink-muted ml-6">
                                Multiple license holders allowed. You can resell this license.
                              </p>
                            </button>

                            <button
                              onClick={() => setLicenseType('exclusive')}
                              className={`p-lg border text-left transition-colors ${
                                licenseType === 'exclusive'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-hairline hover:bg-surface-1'
                              }`}
                            >
                              <div className="flex items-center gap-sm mb-sm">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  licenseType === 'exclusive' ? 'border-primary' : 'border-hairline-strong'
                                }`}>
                                  {licenseType === 'exclusive' && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <span className="text-body font-medium text-ink">Exclusive</span>
                              </div>
                              <p className="text-body-sm text-ink-muted ml-6">
                                Only one holder. Full rights to distribute and sublicense.
                              </p>
                            </button>
                          </div>
                        </div>

                        {/* Territory */}
                        <div className="mb-lg">
                          <label className="block text-body-sm text-ink-muted mb-sm">Territory</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                            {TERRITORY_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setTerritory(opt.value)}
                                className={`p-sm border text-body-sm text-left transition-colors ${
                                  territory === opt.value
                                    ? 'border-primary bg-primary/5 text-ink'
                                    : 'border-hairline text-ink-muted hover:bg-surface-1'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="mb-lg">
                          <label className="block text-body-sm text-ink-muted mb-sm">Duration</label>
                          <div className="grid grid-cols-3 gap-md">
                            {DURATION_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setDuration(opt.value)}
                                className={`p-lg border text-center transition-colors ${
                                  duration === opt.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-hairline hover:bg-surface-1'
                                }`}
                              >
                                <div className={`text-body font-medium ${
                                  duration === opt.value ? 'text-primary' : 'text-ink'
                                }`}>
                                  {opt.label}
                                </div>
                                <div className="text-caption text-ink-subtle mt-xs">{opt.description}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Resale Royalty Note */}
                        <div className="bg-surface-1 border border-hairline p-md">
                          <div className="flex items-start gap-sm">
                            <svg className="w-4 h-4 text-ink-muted mt-xxs flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <p className="text-body-sm text-ink-muted">
                                <strong>Resale Royalty:</strong> When you resell this license,
                                10% of the sale price is automatically sent to the original author.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sidebar - Summary & Purchase */}
                    <div className="lg:col-span-2">
                      <div className="bg-canvas border border-hairline p-xl sticky top-[100px] max-h-[calc(100vh-120px)] overflow-y-auto">
                        <h2 className="text-card-title text-ink mb-lg">Order Summary</h2>

                        <div className="space-y-sm mb-lg">
                          <div className="flex justify-between text-body-sm">
                            <span className="text-ink-muted">License Type</span>
                            <span className="text-ink font-medium capitalize">{licenseType}</span>
                          </div>
                          <div className="flex justify-between text-body-sm">
                            <span className="text-ink-muted">Territory</span>
                            <span className="text-ink">{TERRITORY_OPTIONS.find(t => t.value === territory)?.label || territory}</span>
                          </div>
                          <div className="flex justify-between text-body-sm">
                            <span className="text-ink-muted">Duration</span>
                            <span className="text-ink">{DURATION_OPTIONS.find(d => d.value === duration)?.label || duration}</span>
                          </div>
                          <div className="border-t border-hairline pt-sm mt-sm">
                            <div className="flex justify-between">
                              <span className="text-body-sm text-ink-muted">License Fee</span>
                              <span className="text-body font-medium text-ink">{licenseFee} XLM</span>
                            </div>
                            <div className="flex justify-between text-caption text-ink-subtle">
                              <span>({karya.harga} XLM × 5)</span>
                              <span>≈ ${(licenseFee * 0.12).toFixed(2)} USD</span>
                            </div>
                          </div>
                          <div className="flex justify-between text-body-sm">
                            <span className="text-ink-muted">Resale Royalty</span>
                            <span className="text-ink">10% to author</span>
                          </div>
                        </div>

                        <button
                          onClick={handlePurchase}
                          disabled={purchaseState !== 'idle'}
                          className="w-full px-lg py-md bg-primary text-on-primary text-body font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-md"
                        >
                          Purchase License — {licenseFee} XLM
                        </button>

                        <p className="text-caption text-ink-subtle text-center">
                          You will need to confirm this transaction in your Freighter wallet.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* EXISTING LICENSES TAB */}
        {/* ============================================================ */}
        {activeTab === 'existing' && (
          <div>
            {licensesLoading ? (
              <div className="flex justify-center py-section">
                <Spinner size="lg" />
              </div>
            ) : licenses.length === 0 ? (
              <div className="bg-canvas border border-hairline p-xl text-center">
                <div className="w-16 h-16 bg-surface-1 flex items-center justify-center mx-auto mb-md">
                  <svg className="w-8 h-8 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-card-title text-ink mb-sm">No Licenses Issued</h2>
                <p className="text-body text-ink-muted mb-lg">
                  {isOwner
                    ? 'No one has purchased a license for this work yet.'
                    : 'Be the first to purchase a license for this work!'}
                </p>
                {!isOwner && (
                  <button
                    onClick={() => setActiveTab('purchase')}
                    className="px-lg py-md bg-primary text-on-primary text-body hover:bg-primary-hover transition-colors"
                  >
                    Purchase License
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-md">
                {licenses.map((license) => {
                  const isUserLicense = license.purchaser_wallet === walletAddress;
                  const statusColor = license.status === 'active' ? 'bg-semantic-success/10 text-semantic-success' 
                    : license.status === 'expired' ? 'bg-semantic-warning/10 text-ink' 
                    : 'bg-surface-2 text-ink-subtle';

                  return (
                    <div
                      key={license.id}
                      className={`bg-canvas border p-lg ${
                        isUserLicense ? 'border-primary/30' : 'border-hairline'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-md">
                        <div>
                          <div className="flex items-center gap-sm mb-xs">
                            <h3 className="text-body font-medium text-ink capitalize">
                              {license.license_type} License
                            </h3>
                            {isUserLicense && (
                              <Badge variant="success">Yours</Badge>
                            )}
                            <span className={`inline-flex items-center text-caption px-xs py-xxs ${statusColor}`}>
                              {license.status}
                            </span>
                          </div>
                          <p className="text-body-sm text-ink-muted">
                            Purchased by {truncateAddress(license.purchaser_wallet, 6)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-body font-medium text-ink">{license.license_fee} XLM</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md text-body-sm">
                        <div>
                          <span className="text-ink-muted block">Territory</span>
                          <span className="text-ink">{TERRITORY_OPTIONS.find(t => t.value === license.territory)?.label || license.territory}</span>
                        </div>
                        <div>
                          <span className="text-ink-muted block">Duration</span>
                          <span className="text-ink capitalize">{license.duration === 'perpetual' ? 'Perpetual' : license.duration}</span>
                        </div>
                        <div>
                          <span className="text-ink-muted block">Resale Royalty</span>
                          <span className="text-ink">{license.resale_percentage}%</span>
                        </div>
                        <div>
                          <span className="text-ink-muted block">Resales</span>
                          <span className="text-ink">{license.resale_count} ({license.total_resale_volume} XLM)</span>
                        </div>
                      </div>

                      {license.expires_at && (
                        <p className="text-caption text-ink-subtle mt-sm">
                          Expires: {new Date(license.expires_at).toLocaleDateString()}
                        </p>
                      )}

                      {/* On-chain Signing for Original Author */}
                      {isOwner && license.status === 'active' && (
                        <OnChainSignButton
                          licenseId={license.id}
                          networkPassphrase={
                            process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'public'
                              ? 'Public Global Stellar Network ; September 2015'
                              : 'Test SDF Network ; September 2015'
                          }
                        />
                      )}                        {/* Actions for licensee */}
                      {isUserLicense && license.status === 'active' && !isOwner && (
                        <div className="mt-md pt-md border-t border-hairline">
                          {/* Royalty Display */}
                          <div className="bg-surface-1 border border-hairline p-md mb-md">
                            <p className="text-body-sm text-ink-muted mb-xs">Resale Royalty Breakdown</p>
                            <div className="grid grid-cols-3 gap-md text-center">
                              <div>
                                <p className="text-body-lg font-medium text-ink">{license.resale_percentage}%</p>
                                <p className="text-caption text-ink-subtle">To Author</p>
                              </div>
                              <div>
                                <p className="text-body-lg font-medium text-ink">{100 - license.resale_percentage}%</p>
                                <p className="text-caption text-ink-subtle">You Keep</p>
                              </div>
                              <div>
                                <p className="text-body-lg font-medium text-ink">{license.resale_count}</p>
                                <p className="text-caption text-ink-subtle">Past Resales</p>
                              </div>
                            </div>
                            {license.total_resale_volume > 0 && (
                              <p className="text-caption text-ink-muted mt-xs text-center">
                                {license.total_resale_volume} XLM total resale volume
                              </p>
                            )}
                          </div>

                          <p className="text-body-sm text-ink-muted mb-sm">
                            You hold this license. You can resell it to another party.
                          </p>
                          <ResellModal
                            licenseId={license.id}
                            licenseFee={license.license_fee}
                            resalePercentage={license.resale_percentage}
                            networkPassphrase={
                              process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'public'
                                ? 'Public Global Stellar Network ; September 2015'
                                : 'Test SDF Network ; September 2015'
                            }
                            onResellComplete={() => {
                              // Refresh licenses after resale
                              fetch(`${API_BASE}/api/v1/licenses/karya/${karyaId}`)
                                .then(r => r.ok ? r.json() : null)
                                .then(d => { if (d) setLicenses(d.licenses || []); });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

// ============================================================
// Resell License Modal Component
// ============================================================

function ResellModal({
  licenseId,
  licenseFee,
  resalePercentage,
  networkPassphrase,
  onResellComplete,
}: {
  licenseId: string;
  licenseFee: number;
  resalePercentage: number;
  networkPassphrase: string;
  onResellComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [buyerWallet, setBuyerWallet] = useState('');
  const [salePrice, setSalePrice] = useState(String(licenseFee * 2)); // Default 2x
  const [state, setState] = useState<'idle' | 'initiating' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<{ tx_hash: string; explorer_url: string; sale_price: number; author_royalty: number; seller_receives: number } | null>(null);

  const salePriceNum = parseFloat(salePrice) || 0;
  const authorRoyalty = Math.round(salePriceNum * (resalePercentage / 100) * 1e6) / 1e6;
  const sellerReceives = Math.round((salePriceNum - authorRoyalty) * 1e6) / 1e6;

  const handleResell = async () => {
    setState('initiating');
    setErrorMsg('');

    try {
      const token = localStorage.getItem('jingga_auth_token');

      // Step 1: Initiate resale
      const initiateRes = await fetch(`${API_BASE}/api/v1/licenses/resale/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        } as HeadersInit,
        body: JSON.stringify({
          license_id: licenseId,
          buyer_wallet: buyerWallet.trim(),
          sale_price: salePriceNum,
        }),
      });

      if (!initiateRes.ok) {
        const errData = await initiateRes.json();
        throw new Error(errData.error || 'Failed to initiate resale');
      }

      const { xdr } = await initiateRes.json();

      // Step 2: Sign with Freighter
      setState('signing');
      const signedXdr = await freighterSign(xdr, networkPassphrase);

      // Step 3: Confirm resale
      setState('confirming');
      const confirmRes = await fetch(`${API_BASE}/api/v1/licenses/resale/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        } as HeadersInit,
        body: JSON.stringify({
          signed_xdr: signedXdr,
          license_id: licenseId,
          buyer_wallet: buyerWallet.trim(),
          sale_price: salePriceNum,
        }),
      });

      if (!confirmRes.ok) {
        const errData = await confirmRes.json();
        throw new Error(errData.error || 'Failed to confirm resale');
      }

      const data = await confirmRes.json();
      setResult(data);
      setState('success');
      onResellComplete();
    } catch (err: any) {
      console.error('[ResellModal] Error:', err);
      setErrorMsg(err.message || 'Resale failed');
      setState('error');
    }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setState('idle'); setResult(null); setErrorMsg(''); }}
        className="px-md py-xs bg-primary text-on-primary text-body-sm hover:bg-primary-hover transition-colors"
      >
        Resell License
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative bg-canvas border border-hairline w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-xl py-lg border-b border-hairline">
              <h2 className="text-headline text-ink">Resell License</h2>
              <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink p-xs transition-colors" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-xl py-lg">
              {/* Success State */}
              {state === 'success' && result && (
                <div>
                  <div className="flex items-center gap-md mb-lg">
                    <div className="w-12 h-12 bg-semantic-success/10 flex items-center justify-center">
                      <svg className="w-7 h-7 text-semantic-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-card-title text-ink">License Resold Successfully!</h3>
                      <p className="text-body-sm text-ink-muted">The license has been transferred to the buyer.</p>
                    </div>
                  </div>

                  <div className="bg-surface-1 p-md space-y-sm mb-lg">
                    <div className="flex justify-between text-body-sm">
                      <span className="text-ink-muted">Sale Price</span>
                      <span className="text-ink font-medium">{result.sale_price} XLM</span>
                    </div>
                    <div className="flex justify-between text-body-sm">
                      <span className="text-ink-muted">Author Royalty (10%)</span>
                      <span className="text-ink">{result.author_royalty} XLM</span>
                    </div>
                    <div className="flex justify-between text-body-sm">
                      <span className="text-ink-muted">You Receive</span>
                      <span className="text-ink font-medium text-semantic-success">{result.seller_receives} XLM</span>
                    </div>
                    <div className="border-t border-hairline pt-sm">
                      <div className="flex justify-between text-body-sm">
                        <span className="text-ink-muted">Tx Hash</span>
                        <a href={result.explorer_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-xs">
                          {result.tx_hash.slice(0, 16)}...
                        </a>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setOpen(false)}
                    className="w-full px-lg py-md bg-primary text-on-primary text-body hover:bg-primary-hover transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Error State */}
              {state === 'error' && (
                <div className="mb-lg">
                  <div className="flex items-center gap-md mb-md">
                    <div className="w-10 h-10 bg-semantic-error/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-semantic-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-card-title text-ink">Resale Failed</h3>
                      <p className="text-body-sm text-ink-muted">{errorMsg}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setState('idle'); setErrorMsg(''); }}
                    className="px-lg py-md bg-primary text-on-primary text-body hover:bg-primary-hover transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Loading States */}
              {(state === 'initiating' || state === 'signing' || state === 'confirming') && (
                <div className="flex items-center gap-md mb-lg">
                  <Spinner size="md" />
                  <div>
                    <h3 className="text-card-title text-ink">
                      {state === 'initiating' && 'Preparing resale...'}
                      {state === 'signing' && 'Waiting for wallet confirmation...'}
                      {state === 'confirming' && 'Processing transaction...'}
                    </h3>
                    <p className="text-body-sm text-ink-muted">
                      {state === 'signing' && 'Please confirm in Freighter'}
                      {state === 'confirming' && 'Submitting to Stellar network'}
                    </p>
                  </div>
                </div>
              )}

              {/* Form */}
              {state === 'idle' && (
                <div className="space-y-lg">
                  {/* How it Works */}
                  <div className="bg-surface-1 border border-hairline p-md">
                    <p className="text-body-sm text-ink-muted mb-sm">
                      <strong className="text-ink">How Resale Works:</strong>
                    </p>
                    <ul className="text-body-sm text-ink-muted space-y-xs">
                      <li className="flex items-start gap-sm">
                        <span className="text-primary mt-xxs">&bull;</span>
                        You set a sale price. The <strong className="text-ink">buyer</strong> pays this amount.
                      </li>
                      <li className="flex items-start gap-sm">
                        <span className="text-semantic-success mt-xxs">&bull;</span>
                        <strong className="text-ink">{resalePercentage}%</strong> goes to the original author (royalty).
                      </li>
                      <li className="flex items-start gap-sm">
                        <span className="text-primary mt-xxs">&bull;</span>
                        <strong className="text-ink">{100 - resalePercentage}%</strong> goes to <strong className="text-ink">you</strong>.
                      </li>
                      <li className="flex items-start gap-sm">
                        <span className="text-ink-muted mt-xxs">&bull;</span>
                        The license transfers to the new buyer.
                      </li>
                    </ul>
                  </div>

                  {/* Buyer Wallet */}
                  <div className="flex flex-col gap-xs">
                    <label className="text-body-sm text-ink-muted">Buyer Wallet Address</label>
                    <input
                      type="text"
                      value={buyerWallet}
                      onChange={(e) => setBuyerWallet(e.target.value)}
                      placeholder="G..."
                      className="w-full bg-surface-1 text-body py-[11px] px-md border-b border-hairline placeholder:text-ink-subtle focus:outline-none focus:border-b-2 focus:border-primary"
                    />
                  </div>

                  {/* Sale Price */}
                  <div className="flex flex-col gap-xs">
                    <label className="text-body-sm text-ink-muted">Sale Price (XLM)</label>
                    <input
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      min="0.1"
                      step="0.1"
                      className="w-full bg-surface-1 text-body py-[11px] px-md border-b border-hairline placeholder:text-ink-subtle focus:outline-none focus:border-b-2 focus:border-primary"
                    />
                  </div>

                  {/* Price Breakdown */}
                  {salePriceNum > 0 && (
                    <div className="bg-surface-1 border border-hairline p-md">
                      <p className="text-body-sm text-ink-muted mb-sm">Price Breakdown</p>
                      <div className="space-y-xs">
                        <div className="flex justify-between text-body-sm">
                          <span className="text-ink-muted">Sale Price</span>
                          <span className="text-ink">{salePriceNum} XLM</span>
                        </div>
                        <div className="flex justify-between text-body-sm">
                          <span className="text-ink-muted">Author Royalty ({resalePercentage}%)</span>
                          <span className="text-ink">{authorRoyalty} XLM</span>
                        </div>
                        <div className="border-t border-hairline pt-xs flex justify-between text-body-sm">
                          <span className="text-ink-muted">You Receive</span>
                          <span className="text-ink font-medium text-semantic-success">{sellerReceives} XLM</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleResell}
                    disabled={!buyerWallet.trim() || salePriceNum <= 0}
                    className="w-full px-lg py-md bg-primary text-on-primary text-body font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {buyerWallet.trim() && salePriceNum > 0
                      ? `Resell for ${salePriceNum} XLM`
                      : 'Enter buyer and price'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// On-Chain Sign Button Component
// ============================================================

function OnChainSignButton({
  licenseId,
  networkPassphrase,
}: {
  licenseId: string;
  networkPassphrase: string;
}) {
  const [signState, setSignState] = useState<'idle' | 'fetching' | 'signing' | 'submitting' | 'success' | 'error'>('idle');
  const [signError, setSignError] = useState('');
  const [txHash, setTxHash] = useState('');

  const handleSign = async () => {
    setSignState('fetching');
    setSignError('');
    setTxHash('');

    try {
      const token = localStorage.getItem('jingga_auth_token');

      // Step 1: Fetch unsigned XDR from /:id/xdr
      const xdrRes = await fetch(
        `${API_BASE}/api/v1/licenses/${licenseId}/xdr`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {} as any,
        },
      );

      if (!xdrRes.ok) {
        const err = await xdrRes.json();
        throw new Error(err.error || 'Failed to fetch signing XDR');
      }

      const xdrData = await xdrRes.json();
      if (!xdrData.success) {
        throw new Error(xdrData.error || 'Failed to prepare transaction — contract error');
      }
      if (!xdrData.xdr) {
        throw new Error('No XDR received from server');
      }

      // Step 2: Sign with Freighter
      setSignState('signing');
      const xdr = xdrData.xdr;
      const signedXdr = await freighterSign(xdr, networkPassphrase);

      // Step 3: Submit signed XDR
      setSignState('submitting');
      const submitRes = await fetch(
        `${API_BASE}/api/v1/licenses/${licenseId}/submit-soroban`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          } as any,
          body: JSON.stringify({ signed_xdr: signedXdr }),
        },
      );

      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.error || 'Failed to submit transaction');
      }

      const result = await submitRes.json();
      setTxHash(result.tx_hash);
      setSignState('success');
    } catch (err: any) {
      console.error('[OnChainSign] Error:', err);
      setSignError(err.message || 'Signing failed');
      setSignState('error');
    }
  };

  if (signState === 'success') {
    return (
      <div className="mt-md pt-md border-t border-hairline">
        <div className="flex items-center gap-xs text-semantic-success mb-xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-body-sm font-medium">Registered on Stellar</span>
        </div>
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-body-sm text-primary hover:underline"
        >
          View transaction &rarr;
        </a>
      </div>
    );
  }

  if (signState === 'fetching' || signState === 'signing' || signState === 'submitting') {
    return (
      <div className="mt-md pt-md border-t border-hairline">
        <div className="flex items-center gap-sm">
          <Spinner size="sm" />
          <span className="text-body-sm text-ink-muted">
            {signState === 'fetching' && 'Preparing transaction...'}
            {signState === 'signing' && 'Waiting for Freighter...'}
            {signState === 'submitting' && 'Submitting to Stellar...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-md pt-md border-t border-hairline">
      <p className="text-body-sm text-ink-muted mb-sm">
        Sign this license on the Stellar blockchain to create an immutable record.
      </p>

      {signState === 'error' && (
        <p className="text-body-sm text-semantic-error mb-sm">{signError}</p>
      )}

      <button
        onClick={handleSign}
        className="px-md py-xs bg-primary text-on-primary text-body-sm hover:bg-primary-hover transition-colors"
      >
        Sign on Stellar
      </button>
    </div>
  );
}

