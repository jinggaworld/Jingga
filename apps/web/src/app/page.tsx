export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Utility Bar */}
      <div className="bg-surface-1 py-xxs px-lg text-caption text-ink-muted">
        <div className="mx-auto max-w-[1584px] flex items-center justify-between">
          <span>Jingga — Stellar Testnet</span>
          <span>Publication & Royalty Platform</span>
        </div>
      </div>

      {/* Top Navigation */}
      <nav className="border-b border-hairline bg-canvas py-sm px-lg sticky top-0 z-50">
        <div className="mx-auto max-w-[1584px] flex items-center justify-between">
          <a href="/" className="text-headline font-semibold text-ink tracking-tight">
            Jingga
          </a>
          <div className="flex items-center gap-xl text-body-sm">
            <a href="/marketplace" className="text-ink-muted hover:text-primary transition-colors">
              Marketplace
            </a>
            <a href="/dashboard" className="text-ink-muted hover:text-primary transition-colors">
              Dashboard
            </a>
            <a href="/upload" className="text-ink-muted hover:text-primary transition-colors">
              Upload
            </a>
          </div>
          <button className="bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors">
            Connect Wallet
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-canvas py-section px-lg">
        <div className="mx-auto max-w-[1584px]">
          <h1 className="text-display-lg text-ink mb-lg max-w-4xl">
            Publish your work. Get paid instantly.
          </h1>
          <p className="text-body-lg text-ink-muted mb-xl max-w-2xl">
            A publication & royalty platform for independent writers, researchers, and creators
            across Southeast Asia. Built on Stellar — instant payments, transparent royalties,
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

      {/* Footer */}
      <footer className="bg-inverse-canvas py-xxl px-lg text-inverse-ink-muted">
        <div className="mx-auto max-w-[1584px]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl mb-xl">
            <div>
              <h3 className="text-body-emphasis text-inverse-ink mb-md">Platform</h3>
              <ul className="space-y-sm text-body-sm">
                <li><a href="/marketplace" className="hover:text-inverse-ink transition-colors">Marketplace</a></li>
                <li><a href="/upload" className="hover:text-inverse-ink transition-colors">Upload Work</a></li>
                <li><a href="/dashboard" className="hover:text-inverse-ink transition-colors">Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-body-emphasis text-inverse-ink mb-md">Developers</h3>
              <ul className="space-y-sm text-body-sm">
                <li><a href="https://developers.stellar.org" className="hover:text-inverse-ink transition-colors" target="_blank" rel="noopener noreferrer">Stellar Docs</a></li>
                <li><a href="https://soroban.stellar.org" className="hover:text-inverse-ink transition-colors" target="_blank" rel="noopener noreferrer">Soroban Docs</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-body-emphasis text-inverse-ink mb-md">About</h3>
              <ul className="space-y-sm text-body-sm">
                <li>APAC Stellar Hackathon 2026</li>
                <li>Local Finance & Real-World Access (RWA)</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-inverse-surface-1 pt-lg text-caption">
            © 2026 Jingga. Built on Stellar.
          </div>
        </div>
      </footer>
    </main>
  );
}
