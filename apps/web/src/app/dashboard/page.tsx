export default function DashboardPage() {
  return (
    <main className="min-h-screen">
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
            <a href="/dashboard" className="text-primary font-semibold">
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

      <div className="mx-auto max-w-[1584px] py-xl px-lg">
        <h1 className="text-display-md text-ink mb-lg">Dashboard</h1>
        <p className="text-body-lg text-ink-muted mb-xl">
          Manage your works and track your earnings.
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-xl">
          {[
            { label: 'Total Works', value: '0' },
            { label: 'Total Sales', value: '0' },
            { label: 'Total Revenue', value: '0 XLM' },
            { label: 'Total Views', value: '0' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-1 border border-hairline p-lg rounded-none"
            >
              <p className="text-body-sm text-ink-muted mb-xs">{stat.label}</p>
              <p className="text-headline text-ink">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Empty State */}
        <div className="text-center py-section">
          <p className="text-headline text-ink mb-md">No works yet</p>
          <p className="text-body text-ink-muted mb-lg">
            Upload your first work to get started.
          </p>
          <a
            href="/upload"
            className="inline-block bg-primary text-on-primary text-button py-sm px-lg rounded-none hover:bg-primary-hover transition-colors"
          >
            Upload Work
          </a>
        </div>
      </div>
    </main>
  );
}
