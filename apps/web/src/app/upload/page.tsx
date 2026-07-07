'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ConnectWallet } from '@/components/auth/ConnectWallet';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FileUploadZone } from '@/components/upload/FileUploadZone';
import { PublishProgress, PublishStep } from '@/components/upload/PublishProgress';
import { publishKarya, type PublishData } from '@/services/publishService';

type UploadStep = 1 | 2 | 3;

interface FormData {
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: string;
  tags: string;
}

export default function UploadPage() {
  const { isConnected } = useAuth();
  const [step, setStep] = useState<UploadStep>(1);
  const [form, setForm] = useState<FormData>({
    judul: '',
    deskripsi: '',
    kategori: '',
    harga: '',
    tags: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [publishStep, setPublishStep] = useState<PublishStep>('idle');
  const [publishMessage, setPublishMessage] = useState('');
  const [publishResult, setPublishResult] = useState<any>(null);
  const [publishError, setPublishError] = useState('');

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-surface-1">
        <div className="mx-auto max-w-[1584px] py-xl px-lg">
          <h1 className="text-display-md text-ink mb-lg">Upload Work</h1>
          <div className="max-w-md mx-auto text-center py-section">
            <p className="text-body-lg text-ink-muted mb-lg">
              Connect your wallet to start publishing.
            </p>
            <ConnectWallet />
          </div>
        </div>
      </main>
    );
  }

  const canProceedStep1 = form.judul.length >= 3 && form.deskripsi.length >= 10 && form.kategori && form.harga;
  const canProceedStep2 = !!file;

  const handlePublish = async () => {
    setPublishStep('creating');
    setPublishMessage('Creating work...');

    try {
      const publishData: PublishData = {
        judul: form.judul,
        deskripsi: form.deskripsi,
        kategori: form.kategori,
        harga: parseFloat(form.harga),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        file: file!,
        cover: cover || undefined,
      };

      setPublishStep('uploading');
      setPublishMessage('Uploading to IPFS...');

      const result = await publishKarya(publishData);

      if (result.requiresSigning && result.xdr) {
        setPublishStep('minting');
        setPublishMessage('Waiting for wallet signature...');
      } else {
        setPublishStep('minting');
        setPublishMessage('Minting on Stellar...');
        await new Promise(r => setTimeout(r, 1500));
      }

      setPublishResult(result);
      setPublishStep('success');
    } catch (err: any) {
      console.error('[Upload] Publish error:', err);
      setPublishError(err.message || 'Failed to publish work');
      setPublishStep('error');
    }
  };

  const stepNames = ['Details', 'File', 'Review'];

  return (
    <main className="min-h-screen bg-surface-1">
      <div className="mx-auto max-w-[1584px] py-xl px-lg">
        <h1 className="text-display-md text-ink mb-lg">Upload Work</h1>
        <p className="text-body-lg text-ink-muted mb-xl">
          Publish your work and start earning royalties.
        </p>

        {/* Step Indicator */}
        {publishStep === 'idle' && (
          <div className="flex items-center gap-md mb-xl">
            {stepNames.map((name, i) => (
              <div key={name} className="flex items-center gap-sm">
                <div
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-body-sm ${
                    step > i + 1
                      ? 'bg-semantic-success text-white'
                      : step === i + 1
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-1 text-ink-subtle border border-hairline'
                  }`}
                >
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span
                  className={`text-body-sm hidden sm:inline ${
                    step === i + 1 ? 'text-ink font-semibold' : 'text-ink-subtle'
                  }`}
                >
                  {name}
                </span>
                {i < 2 && <div className="w-8 h-px bg-hairline mx-sm hidden sm:block" />}
              </div>
            ))}
          </div>
        )}

        {/* Publish Progress */}
        {publishStep !== 'idle' && (
          <div className="max-w-2xl mx-auto mb-xl">
            <PublishProgress
              step={publishStep}
              message={publishMessage}
              txHash={publishResult?.txHash}
              explorerUrl={publishResult?.explorerUrl}
              assetCode={publishResult?.karya?.stellar_asset_code}
              karyaJudul={publishResult?.karya?.judul}
              error={publishError}
              onRetry={() => {
                setPublishStep('idle');
                setPublishError('');
              }}
            />
          </div>
        )}

        {/* Form Steps */}
        {publishStep === 'idle' && (
          <div className="max-w-2xl">
            {step === 1 && (
              <div className="bg-canvas border border-hairline p-xl rounded-none">
                <h2 className="text-card-title text-ink mb-lg">Work Details</h2>
                <div className="flex flex-col gap-md">
                  <Input
                    label="Title"
                    placeholder="Enter work title"
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    required
                  />
                  <TextArea
                    label="Description"
                    placeholder="Describe your work..."
                    value={form.deskripsi}
                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                    rows={4}
                    required
                  />
                  <Select
                    label="Category"
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    options={[
                      { value: 'fiksi', label: 'Fiction' },
                      { value: 'paper', label: 'Paper' },
                      { value: 'puisi', label: 'Poetry' },
                      { value: 'non-fiksi', label: 'Non-Fiction' },
                    ]}
                    placeholder="Select category"
                    required
                  />
                  <Input
                    label="Price (XLM)"
                    type="number"
                    placeholder="0.1"
                    min="0.1"
                    step="0.1"
                    value={form.harga}
                    onChange={(e) => setForm({ ...form, harga: e.target.value })}
                    required
                  />
                  <Input
                    label="Tags (comma-separated)"
                    placeholder="fiction, novel, indie"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </div>
                <div className="flex justify-end mt-lg">
                  <Button onClick={() => setStep(2)} disabled={!canProceedStep1} variant="primary">
                    Next: Upload File
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-canvas border border-hairline p-xl rounded-none">
                <h2 className="text-card-title text-ink mb-lg">Upload File</h2>
                <FileUploadZone
                  onUpload={async (f) => { setFile(f); }}
                  label="Upload Work File"
                  description="Drag & drop your manuscript here, or click to browse"
                />
                {file && (
                  <div className="mt-md bg-surface-1 border border-hairline p-md rounded-none">
                    <p className="text-body-sm text-ink">{file.name}</p>
                    <p className="text-caption text-ink-subtle">File ready</p>
                  </div>
                )}
                <div className="flex justify-between mt-lg">
                  <Button onClick={() => setStep(1)} variant="ghost">Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!canProceedStep2} variant="primary">
                    Next: Review
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-canvas border border-hairline p-xl rounded-none">
                <h2 className="text-card-title text-ink mb-lg">Review & Publish</h2>
                <div className="space-y-md mb-lg">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-ink-muted">Title</span>
                    <span className="text-ink">{form.judul}</span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-ink-muted">Category</span>
                    <span className="text-ink">{form.kategori}</span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-ink-muted">Price</span>
                    <span className="text-ink">{form.harga} XLM</span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-ink-muted">File</span>
                    <span className="text-ink">{file?.name}</span>
                  </div>
                </div>
                <div className="bg-surface-1 border border-hairline p-md rounded-none mb-lg">
                  <p className="text-body-sm text-ink-muted">
                    By publishing, you confirm this is your original work and agree to the platform
                    terms. The work will be minted as a Stellar asset for proof of authorship.
                  </p>
                </div>
                <div className="flex justify-between">
                  <Button onClick={() => setStep(2)} variant="ghost">Back</Button>
                  <Button onClick={handlePublish} variant="primary" size="lg">Publish Work</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
