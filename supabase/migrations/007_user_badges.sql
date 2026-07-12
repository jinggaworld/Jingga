-- ============================================================
-- Jingga User Badge System
-- Migration 007: Discord-style Achievement Badges
-- ============================================================

-- ============================================================
-- BADGE_DEFINITIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                    -- e.g., 'published_author', 'bestseller'
  name TEXT NOT NULL,                           -- Display name: "Published Author"
  description TEXT NOT NULL,                    -- "Published your first work"
  icon_name TEXT NOT NULL DEFAULT 'star',       -- Icon identifier
  category TEXT NOT NULL CHECK (category IN (
    'achievement', 'contribution', 'status', 'milestone'
  )),
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 5),  -- Bronze(1) to Diamond(5)
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Auto-assignment rules
  is_hidden BOOLEAN NOT NULL DEFAULT false,      -- Hidden until unlocked
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER_BADGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES badge_definitions(code),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  progress NUMERIC(5, 2),                    -- Progress toward next tier (0-100)
  metadata JSONB DEFAULT '{}'::jsonb,           -- Extra context (e.g., karya_id)
  UNIQUE(user_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_code ON user_badges(badge_code);

-- ============================================================
-- SEED BADGE DEFINITIONS
-- ============================================================
INSERT INTO badge_definitions (code, name, description, icon_name, category, tier, criteria, is_hidden) VALUES
  -- Achievement Badges (earned through actions)
  ('first_publish', 'First Publication', 'Published your first work on Jingga', 'feather', 'achievement', 1, '{"type": "publish_count", "threshold": 1}', false),
  ('prolific_author', 'Prolific Author', 'Published 5 works', 'pen', 'achievement', 2, '{"type": "publish_count", "threshold": 5}', false),
  ('master_author', 'Master Author', 'Published 10 works', 'crown', 'achievement', 3, '{"type": "publish_count", "threshold": 10}', false),
  ('bestseller', 'Bestseller', 'A single work sold 10+ copies', 'trophy', 'milestone', 2, '{"type": "single_karya_sales", "threshold": 10}', false),
  ('top_seller', 'Top Seller', 'A single work sold 50+ copies', 'diamond', 'milestone', 3, '{"type": "single_karya_sales", "threshold": 50}', false),
  ('earned_100', 'Century', 'Earned 100 XLM in total revenue', 'coin', 'milestone', 2, '{"type": "total_revenue_xlm", "threshold": 100}', false),
  ('earned_1000', 'Thousand Club', 'Earned 1,000 XLM in total revenue', 'gem', 'milestone', 4, '{"type": "total_revenue_xlm", "threshold": 1000}', false),
  ('first_purchase', 'Reader', 'Made your first purchase on Jingga', 'book', 'achievement', 1, '{"type": "purchase_count", "threshold": 1}', false),
  ('bibliophile', 'Bibliophile', 'Purchased 10 works', 'books', 'achievement', 3, '{"type": "purchase_count", "threshold": 10}', false),

  -- Contribution Badges
  ('collaborator', 'Collaborator', 'Contributed as collaborator on 3+ works', 'users', 'contribution', 1, '{"type": "collaboration_count", "threshold": 3}', false),
  ('license_holder', 'License Holder', 'Purchased a license for a work', 'license', 'contribution', 1, '{"type": "license_purchase", "threshold": 1}', false),
  ('reseller', 'Reseller', 'Successfully resold a license', 'exchange', 'contribution', 2, '{"type": "license_resale", "threshold": 1}', false),

  -- Status Badges
  ('verified', 'Verified', 'Verified identity on Jingga', 'shield', 'status', 1, '{"type": "email_verified", "threshold": 1}', false),
  ('hackathon_2026', 'APAC Innovator', 'Part of APAC Stellar Hackathon 2026', 'star', 'status', 1, '{"type": "hackathon", "threshold": 1}', false),
  ('early_adopter', 'Early Adopter', 'Joined Jingga during beta', 'rocket', 'status', 1, '{"type": "early_user", "threshold": 1}', false),

  -- Premium
  ('stellar_native', 'Stellar Native', 'Connected with Freighter wallet', 'zap', 'status', 1, '{"type": "freighter_user", "threshold": 1}', false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- FUNCTIONS: Auto-assign badges on events
-- ============================================================

-- Auto-assign badge on purchase
CREATE OR REPLACE FUNCTION check_purchase_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- First Purchase badge
  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT NEW.buyer_wallet, 'first_purchase', jsonb_build_object('karya_id', NEW.karya_id, 'tx_hash', NEW.stellar_tx_hash)
  FROM users u WHERE u.wallet_address = NEW.buyer_wallet
    AND NOT EXISTS (
      SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'first_purchase'
    );

  -- Bibliophile badge (10 purchases)
  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'bibliophile', jsonb_build_object('count', cnt)
  FROM (
    SELECT buyer_wallet, COUNT(*) as cnt
    FROM transactions
    WHERE buyer_wallet = NEW.buyer_wallet AND status = 'confirmed'
    GROUP BY buyer_wallet
  ) t JOIN users u ON u.wallet_address = t.buyer_wallet
  WHERE t.cnt >= 10
    AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'bibliophile');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_purchase_badges ON transactions;
CREATE TRIGGER trigger_purchase_badges
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION check_purchase_badges();

-- Auto-assign badge on karya publish
CREATE OR REPLACE FUNCTION check_publish_badges()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    -- First Publication badge
    INSERT INTO user_badges (user_id, badge_code, metadata)
    SELECT u.id, 'first_publish', jsonb_build_object('karya_id', NEW.id, 'judul', NEW.judul)
    FROM users u WHERE u.wallet_address = NEW.issuer_wallet
      AND NOT EXISTS (
        SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'first_publish'
      );

    -- Prolific Author (5 works)
    INSERT INTO user_badges (user_id, badge_code, metadata)
    SELECT u.id, 'prolific_author', jsonb_build_object('count', cnt)
    FROM (
      SELECT issuer_wallet, COUNT(*) as cnt
      FROM karya
      WHERE issuer_wallet = NEW.issuer_wallet AND status = 'published'
      GROUP BY issuer_wallet
    ) t JOIN users u ON u.wallet_address = t.issuer_wallet
    WHERE t.cnt >= 5
      AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'prolific_author');

    -- Master Author (10 works)
    INSERT INTO user_badges (user_id, badge_code, metadata)
    SELECT u.id, 'master_author', jsonb_build_object('count', cnt)
    FROM (
      SELECT issuer_wallet, COUNT(*) as cnt
      FROM karya
      WHERE issuer_wallet = NEW.issuer_wallet AND status = 'published'
      GROUP BY issuer_wallet
    ) t JOIN users u ON u.wallet_address = t.issuer_wallet
    WHERE t.cnt >= 10
      AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'master_author');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_publish_badges ON karya;
CREATE TRIGGER trigger_publish_badges
  AFTER UPDATE ON karya
  FOR EACH ROW
  WHEN (NEW.status = 'published' AND OLD.status = 'draft')
  EXECUTE FUNCTION check_publish_badges();

-- Auto-assign sales milestone badges
CREATE OR REPLACE FUNCTION check_sales_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Bestseller & Top Seller: Check if any karya hit the threshold
  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'bestseller', jsonb_build_object('karya_id', NEW.karya_id, 'sales', NEW.total_sales)
  FROM karya k JOIN users u ON u.wallet_address = k.issuer_wallet
  WHERE k.id = NEW.karya_id AND k.total_sales >= 10
    AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'bestseller');

  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'top_seller', jsonb_build_object('karya_id', NEW.karya_id, 'sales', NEW.total_sales)
  FROM karya k JOIN users u ON u.wallet_address = k.issuer_wallet
  WHERE k.id = NEW.karya_id AND k.total_sales >= 50
    AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'top_seller');

  -- Revenue badges
  INSERT INTO user_badges (user_id, badge_code, metadata)
  SELECT u.id, 'earned_100', jsonb_build_object('total', NEW.total_revenue)
  FROM karya k JOIN users u ON u.wallet_address = k.issuer_wallet
  WHERE k.id = NEW.karya_id AND k.total_revenue >= 100
    AND NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_code = 'earned_100');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sales_badges ON karya;
CREATE TRIGGER trigger_sales_badges
  AFTER UPDATE ON karya
  FOR EACH ROW
  WHEN (NEW.total_sales > OLD.total_sales OR NEW.total_revenue > OLD.total_revenue)
  EXECUTE FUNCTION check_sales_badges();

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badge definitions are public
CREATE POLICY "Badge definitions are viewable by everyone"
  ON badge_definitions FOR SELECT USING (true);

-- Users can view their own badges
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('request.jwt.claims.wallet_address', true))
  );

-- Other users' non-hidden badges are viewable
CREATE POLICY "Non-hidden badges viewable by everyone"
  ON user_badges FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM badge_definitions bd WHERE bd.code = badge_code AND NOT bd.is_hidden)
    OR user_id IN (SELECT id FROM users WHERE wallet_address = current_setting('request.jwt.claims.wallet_address', true))
  );

-- Service role can insert badges
CREATE POLICY "Service role can insert badges"
  ON user_badges FOR INSERT
  WITH CHECK (true);
