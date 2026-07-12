-- ============================================================
-- Jingga Database Schema
-- Migration 008: Add FK from karya.issuer_wallet → users.wallet_address
-- ============================================================
--
-- WHY: PostgREST requires foreign key constraints to infer
-- relationships between tables. The marketplace, karya detail,
-- and reader queries all use `users!issuer_wallet(nama)` join
-- syntax, which fails without a proper FK.
--
-- The `issuer_wallet` column stores the Stellar wallet address
-- of the karya creator, which corresponds to `users.wallet_address`.

-- ============================================================
-- Add FK constraint using NOT VALID (safe for existing data):
--   - New inserts/updates are validated against users table
--   - Existing data is grandfathered in (no cleanup needed)
--   - PostgREST recognizes the relationship via FK definition
-- ============================================================
ALTER TABLE karya
  ADD CONSTRAINT fk_karya_issuer_wallet_users
  FOREIGN KEY (issuer_wallet)
  REFERENCES users(wallet_address)
  NOT VALID;

COMMENT ON CONSTRAINT fk_karya_issuer_wallet_users ON karya IS
  'Enables PostgREST joins between karya and users via issuer_wallet';

-- ============================================================
-- Optionally validate existing data later:
--   ALTER TABLE karya VALIDATE CONSTRAINT fk_karya_issuer_wallet_users;
-- ============================================================
