-- ============================================================
-- Jingga Licenses & Resale Royalty System
-- Migration 006: License Management & Resale Tracking
-- Implements Plan 18 — Resale & License Royalty
-- ============================================================

-- ============================================================
-- LICENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  karya_id UUID NOT NULL REFERENCES karya(id) ON DELETE CASCADE,
  purchaser_wallet TEXT NOT NULL,
  original_author_wallet TEXT NOT NULL,
  license_type TEXT NOT NULL CHECK (license_type IN ('exclusive', 'non-exclusive')),
  territory TEXT NOT NULL DEFAULT 'global',
  duration TEXT NOT NULL DEFAULT 'perpetual',
  resale_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.0 CHECK (resale_percentage >= 0 AND resale_percentage <= 100),
  license_fee NUMERIC(16, 6) NOT NULL CHECK (license_fee > 0),
  stellar_tx_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_licenses_karya_id ON licenses(karya_id);
CREATE INDEX IF NOT EXISTS idx_licenses_purchaser_wallet ON licenses(purchaser_wallet);
CREATE INDEX IF NOT EXISTS idx_licenses_original_author ON licenses(original_author_wallet);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_karya_status ON licenses(karya_id, status);

-- ============================================================
-- RESALE_TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS resale_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  seller_wallet TEXT NOT NULL,
  buyer_wallet TEXT NOT NULL,
  sale_price NUMERIC(16, 6) NOT NULL CHECK (sale_price > 0),
  author_royalty NUMERIC(16, 6) NOT NULL CHECK (author_royalty >= 0),
  seller_receives NUMERIC(16, 6) NOT NULL CHECK (seller_receives >= 0),
  stellar_tx_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'disputed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resale_transactions_license_id ON resale_transactions(license_id);
CREATE INDEX IF NOT EXISTS idx_resale_transactions_seller ON resale_transactions(seller_wallet);
CREATE INDEX IF NOT EXISTS idx_resale_transactions_buyer ON resale_transactions(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_resale_transactions_stellar_tx ON resale_transactions(stellar_tx_hash);

-- ============================================================
-- ROYALTY_SPLITS TABLE (enhanced from Plan 17)
-- ============================================================
CREATE TABLE IF NOT EXISTS royalty_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  karya_id UUID UNIQUE NOT NULL REFERENCES karya(id) ON DELETE CASCADE,
  contract_address TEXT,
  total_percentage NUMERIC(5, 2) NOT NULL CHECK (total_percentage > 0 AND total_percentage <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_royalty_splits_karya_id ON royalty_splits(karya_id);

-- ============================================================
-- ROYALTY_DISTRIBUTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS royalty_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES royalty_splits(id) ON DELETE CASCADE,
  karya_id UUID NOT NULL REFERENCES karya(id) ON DELETE CASCADE,
  payment_tx_hash TEXT NOT NULL,
  total_amount NUMERIC(16, 6) NOT NULL,
  distributions JSONB NOT NULL DEFAULT '[]'::jsonb,
  contract_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_royalty_distributions_split_id ON royalty_distributions(split_id);
CREATE INDEX IF NOT EXISTS idx_royalty_distributions_karya_id ON royalty_distributions(karya_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get active licenses for a karya
CREATE OR REPLACE FUNCTION get_active_licenses(p_karya_id UUID)
RETURNS TABLE(
  id UUID,
  purchaser_wallet TEXT,
  license_type TEXT,
  territory TEXT,
  duration TEXT,
  resale_percentage NUMERIC,
  license_fee NUMERIC,
  status TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.purchaser_wallet, l.license_type, l.territory, l.duration,
         l.resale_percentage, l.license_fee, l.status, l.issued_at, l.expires_at
  FROM licenses l
  WHERE l.karya_id = p_karya_id
    AND l.status = 'active'
  ORDER BY l.issued_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Check if exclusive license already exists
CREATE OR REPLACE FUNCTION has_exclusive_license(p_karya_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM licenses
    WHERE karya_id = p_karya_id
      AND license_type = 'exclusive'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- Calculate resale royalty
CREATE OR REPLACE FUNCTION calculate_resale_royalty(
  p_license_id UUID,
  p_sale_price NUMERIC
) RETURNS TABLE(
  author_royalty NUMERIC,
  seller_receives NUMERIC
) AS $$
DECLARE
  v_resale_pct NUMERIC;
BEGIN
  SELECT resale_percentage INTO v_resale_pct
  FROM licenses
  WHERE id = p_license_id;

  IF v_resale_pct IS NULL THEN
    RAISE EXCEPTION 'License not found';
  END IF;

  author_royalty := ROUND(p_sale_price * v_resale_pct / 100.0, 6);
  seller_receives := p_sale_price - author_royalty;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Licenses RLS
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Licenses viewable by involved parties"
  ON licenses FOR SELECT
  USING (
    purchaser_wallet = current_setting('request.jwt.claims.wallet_address', true)
    OR original_author_wallet = current_setting('request.jwt.claims.wallet_address', true)
    OR EXISTS (
      SELECT 1 FROM karya
      WHERE karya.id = licenses.karya_id
        AND karya.issuer_wallet = current_setting('request.jwt.claims.wallet_address', true)
    )
  );

CREATE POLICY "Authenticated users can purchase licenses"
  ON licenses FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claims.wallet_address', true) IS NOT NULL
  );

-- Resale transactions RLS
ALTER TABLE resale_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resale viewable by involved parties"
  ON resale_transactions FOR SELECT
  USING (
    seller_wallet = current_setting('request.jwt.claims.wallet_address', true)
    OR buyer_wallet = current_setting('request.jwt.claims.wallet_address', true)
    OR EXISTS (
      SELECT 1 FROM licenses l
      WHERE l.id = resale_transactions.license_id
        AND l.original_author_wallet = current_setting('request.jwt.claims.wallet_address', true)
    )
  );

-- Royalty splits RLS
ALTER TABLE royalty_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Royalty splits viewable by karya owner"
  ON royalty_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM karya
      WHERE karya.id = royalty_splits.karya_id
        AND (karya.issuer_wallet = current_setting('request.jwt.claims.wallet_address', true)
             OR current_setting('request.jwt.claims.wallet_address', true) IS NOT NULL)
    )
  );

CREATE POLICY "Authors can manage royalty splits"
  ON royalty_splits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM karya
      WHERE karya.id = royalty_splits.karya_id
        AND karya.issuer_wallet = current_setting('request.jwt.claims.wallet_address', true)
    )
  );

-- Royalty distributions RLS
ALTER TABLE royalty_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributions viewable by involved parties"
  ON royalty_distributions FOR SELECT
  USING (
    current_setting('request.jwt.claims.wallet_address', true) IS NOT NULL
  );
