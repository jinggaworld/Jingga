'use client';

import { Layout } from '@/components/layout/Layout';
import { PoetryBanner } from '@/components/landing/PoetryBanner';

export default function HomePage() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-canvas py-section px-lg overflow-hidden">
        <div className="mx-auto max-w-[1584px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl items-start">
            {/* Left: Headline */}
            <div>
              <h1 className="text-display-lg text-ink mb-lg max-w-2xl">
                Publish your work. Get paid instantly.
              </h1>
              <p className="text-body-lg text-ink-muted mb-xl max-w-xl">
                A publication & royalty platform for independent writers, researchers, and creators
                across Southeast Asia. Built on Stellar: instant payments, transparent royalties,
                no middlemen.
              </p>
              <div className="flex gap-md">
                <a
                  href="/upload"
                  className="bg-primary text-on-primary text-button py-sm px-lg rounded-none hover:bg-primary-hover transition-colors"
                >
                  Start Publishing
                </a>
                <a
                  href="/marketplace"
                  className="border border-primary text-primary text-button py-sm px-lg rounded-none hover:bg-surface-1 transition-colors"
                >
                  Explore Works
                </a>
              </div>
            </div>

            {/* Right: Poetry */}
            <div className="w-full">
              <PoetryBanner />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-surface-1 py-section px-lg">
        <div className="mx-auto max-w-[1584px]">
          <h2 className="text-headline text-ink mb-xl">Why Jingga?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
            {[
              {
                title: 'Instant Payments',
                desc: 'Readers pay directly to your wallet. Zero-day payout.',
              },
              {
                title: 'Proof of Ownership',
                desc: 'Every work is recorded on the Stellar blockchain as proof of originality.',
              },
              {
                title: 'Automatic Royalties',
                desc: 'Collaborators receive their share automatically and transparently.',
              },
              {
                title: 'No Middlemen',
                desc: 'No 30-70% cuts. You set the price.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-canvas border border-hairline p-lg rounded-none"
              >
                <h3 className="text-card-title text-ink mb-sm">{feature.title}</h3>
                <p className="text-body text-ink-muted">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-canvas py-section px-lg">
        <div className="mx-auto max-w-[1584px]">
          <h2 className="text-headline text-ink mb-xl">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {[
              {
                step: '01',
                title: 'Connect Your Wallet',
                desc: 'Sign in with your Stellar wallet using Freighter extension, or create an account with email.',
              },
              {
                step: '02',
                title: 'Publish Your Work',
                desc: 'Upload your manuscript, set a price, and mint it as a Stellar asset for proof of authorship.',
              },
              {
                step: '03',
                title: 'Get Paid Instantly',
                desc: 'Readers pay directly to your wallet. Track royalties and revenue in your dashboard.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-primary text-on-primary text-headline flex items-center justify-center mx-auto mb-md rounded-none">
                  {item.step}
                </div>
                <h3 className="text-card-title text-ink mb-sm">{item.title}</h3>
                <p className="text-body text-ink-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-section px-lg">
        <div className="mx-auto max-w-[1584px] text-center">
          <h2 className="text-headline text-on-primary mb-md">
            Ready to start publishing?
          </h2>
          <p className="text-body-lg text-on-primary opacity-80 mb-lg max-w-2xl mx-auto">
            Join independent writers across Southeast Asia. Set your own price, keep 100% of your revenue.
          </p>
          <div className="flex gap-md justify-center">
            <a
              href="/upload"
              className="bg-on-primary text-primary text-button py-sm px-lg rounded-none hover:opacity-90 transition-colors font-semibold"
            >
              Start Publishing
            </a>
            <a
              href="/marketplace"
              className="border border-on-primary text-on-primary text-button py-sm px-lg rounded-none hover:bg-on-primary hover:text-primary transition-colors"
            >
              Explore Works
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
