'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { KaryaCover } from '@/components/karya/KaryaCover';
import { KaryaInfo } from '@/components/karya/KaryaInfo';
import { KaryaProof } from '@/components/karya/KaryaProof';
import { KaryaDetails } from '@/components/karya/KaryaDetails';
import { KaryaCollaborators } from '@/components/karya/KaryaCollaborators';
import { BuyButton } from '@/components/karya/BuyButton';
import { LicenseInfoCard } from '@/components/karya/LicenseInfoCard';
import { KaryaPreview } from '@/components/karya/KaryaPreview';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/lib/api';

interface KaryaData {
  id: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: number;
  cover_image_url: string | null;
  ipfs_link: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  stellar_asset_code: string;
  issuer_wallet: string;
  issuer_name: string;
  total_sales: number;
  total_revenue: number;
  status: string;
  created_at: string;
  published_at: string | null;
  stellar_tx_hash: string | null;
  proof: {
    verified: boolean;
    timestamp: string | null;
    blockHeight: number | null;
    explorer_url: string | null;
  } | null;
  collaborators: Array<{
    wallet_address: string;
    nama: string | null;
    role: string;
    persentase: number;
  }>;
}

export default function KaryaDetailPage() {
  const params = useParams();
  const { walletAddress } = useAuth();
  const [karya, setKarya] = useState<KaryaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.id) return;

    fetch(`${API_BASE}/api/v1/karya/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Work not found');
        return res.json();
      })
      .then((data) => setKarya(data.karya))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Record view
  useEffect(() => {
    if (karya?.id) {
      fetch(`${API_BASE}/api/v1/karya/${karya.id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewer_wallet: walletAddress }),
      }).catch(() => {});
    }
  }, [karya?.id, walletAddress]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error || !karya) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-headline text-ink mb-md">Work Not Found</h1>
            <p className="text-body text-ink-muted mb-lg">{error || 'This work does not exist or has been archived.'}</p>
            <a href="/marketplace" className="text-primary hover:underline">Back to Marketplace</a>
          </div>
        </div>
      </Layout>
    );
  }

  const isOwner = walletAddress === karya.issuer_wallet;

  return (
    <Layout>
      <div className="mx-auto max-w-[1584px] py-xl px-lg">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-xl mb-xl items-start">
          <div className="lg:col-span-2 max-w-sm">
            <KaryaCover
              src={karya.cover_image_url}
              alt={karya.judul}
              initials={karya.judul.charAt(0)}
            />
          </div>

          <div className="lg:col-span-3 flex flex-col">
            <KaryaInfo
              judul={karya.judul}
              issuer_name={karya.issuer_name}
              kategori={karya.kategori}
              harga={karya.harga}
              total_sales={karya.total_sales}
              issuerWallet={karya.issuer_wallet}
            />

            <div className="mt-auto">
              <BuyButton
                karyaId={karya.id}
                judul={karya.judul}
                harga={karya.harga}
                issuerWallet={karya.issuer_wallet}
                isOwner={isOwner}
              />
            </div>
          </div>
        </div>

        {/* File Preview / Spoiler — placed right after hero so buyers can preview before purchase */}
        <div className="mb-xl">
          <KaryaPreview
            fileUrl={karya.file_url}
            fileType={karya.file_type}
            judul={karya.judul}
          />
        </div>

        {/* Description */}
        <div className="bg-canvas border border-hairline p-xl rounded-none mb-xl">
          <h2 className="text-card-title text-ink mb-md">About this work</h2>
          <p className="text-body text-ink-muted whitespace-pre-wrap">{karya.deskripsi}</p>
        </div>

        {/* Details */}
        <div className="mb-xl">
          <KaryaDetails
            file_type={karya.file_type}
            file_size_bytes={karya.file_size_bytes}
            stellar_asset_code={karya.stellar_asset_code}
            published_at={karya.published_at}
            created_at={karya.created_at}
          />
        </div>

        {/* Proof of Authorship */}
        <div className="mb-xl">
          <KaryaProof proof={karya.proof} txHash={karya.stellar_tx_hash} />
        </div>

        {/* License Info Card */}
        <div className="mb-xl">
          <LicenseInfoCard
            karyaId={karya.id}
            issuerWallet={karya.issuer_wallet}
            userWallet={walletAddress}
            isOwner={isOwner}
          />
        </div>

        {/* Collaborators */}
        {karya.collaborators.length > 0 && (
          <div className="mb-xl">
            <KaryaCollaborators collaborators={karya.collaborators} />
          </div>
        )}
      </div>
    </Layout>
  );
}
