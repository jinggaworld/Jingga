// ============================================================
// Jingga Shared Constants
// ============================================================

export const STELLAR_NETWORK = 'testnet' as const;
export const STELLAR_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015' as const;
export const STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org' as const;
export const STELLAR_FRIENDBOT_URL = 'https://friendbot.stellar.org' as const;

export const STELLAR_ASSET_CODE_PREFIX = 'JINGGA' as const;

export const MAX_FILE_SIZE_MB = 50;
export const MAX_COVER_SIZE_MB = 5;
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ROYALTY_BASIS_POINTS = 10000 as const;

export const KARYA_CATEGORIES = ['fiksi', 'paper', 'puisi', 'non-fiksi'] as const;

// Note: Stellar.expert format is /explorer/<network>/tx/<hash>
export const STELLAR_EXPLORER_TESTNET_URL = 'https://stellar.expert/explorer/testnet' as const;

// ============================================================
// Soroban Smart Contract Addresses (from deployment)
// ============================================================
// Defaults are testnet development addresses from our deploy.
// API overrides these via env vars (CONTRACT_ROYALTY_SPLIT, CONTRACT_LICENSE_MANAGER).
export const CONTRACT_ROYALTY_SPLIT_ID =
  'CARE27GIE5INY76J2RQOKCLBM7CFXBP4SIUDRCJDHE46MPI6XJP7CAR2';

export const CONTRACT_LICENSE_MANAGER_ID =
  'CBIHU3DRV6U3UBMHVIAQQWB2KRCSY6VM3DXNB76ZSHEOCQJR6DFPR7C7';

export const CONTRACT_DEPLOYER_PUBLIC_KEY =
  'GDEB5U56S3WIT3IFIKWTQ2UZPWOLR3W22QHBEV3I4PHBFOHH2BUVYRJH';

