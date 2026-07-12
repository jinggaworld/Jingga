#!/bin/bash
# ============================================================
# Jingga Soroban Smart Contract Deployment Script
# ============================================================
# Prerequisites:
#   - Stellar CLI v26.1.0+ (stellar --version)
#   - Rust + Soroban target installed
#   - A funded Stellar account for deployment
#
# Usage:
#   ./contracts/deploy.sh [network]
#   network: testnet (default) | mainnet
#
# Environment variables:
#   DEPLOYER_SECRET_KEY - Secret key for the deployer account
#   STELLAR_NETWORK     - Network to deploy to (testnet/mainnet)
# ============================================================

set -euo pipefail

NETWORK="${1:-${STELLAR_NETWORK:-testnet}}"
DEPLOYER_SECRET="${DEPLOYER_SECRET_KEY:-}"

echo "============================================"
echo "  Jingga Smart Contract Deployment"
echo "  Network: ${NETWORK}"
echo "============================================"

# Validate deployer secret
if [ -z "${DEPLOYER_SECRET}" ]; then
    echo "ERROR: DEPLOYER_SECRET_KEY environment variable not set"
    echo ""
    echo "Set your Stellar secret key:"
    echo "  export DEPLOYER_SECRET_KEY=SCVL...your-secret-key"
    echo ""
    echo "Or use an existing identity:"
    echo "  stellar keys fund jingga-deployer --network testnet"
    echo "  export DEPLOYER_SECRET_KEY=\$(stellar keys show jingga-deployer)"
    exit 1
fi

# Create output directory
mkdir -p contracts/.deploy

echo ""
echo "--- Step 1: Build Smart Contracts ---"
echo ""

echo "Building royalty-split contract..."
cd contracts/royalty_split
cargo build --target wasm32-unknown-unknown --release 2>&1 | tail -3
cp target/wasm32-unknown-unknown/release/royalty_split.wasm ../../contracts/.deploy/
cd ../..

echo "Building license-manager contract..."
cd contracts/license_manager
cargo build --target wasm32-unknown-unknown --release 2>&1 | tail -3
cp target/wasm32-unknown-unknown/release/license_manager.wasm ../../contracts/.deploy/
cd ../..

echo ""
echo "--- Step 2: Deploy Contracts ---"
echo ""

# Deploy Royalty Split
echo "Deploying RoyaltySplit..."
ROYALTY_OUTPUT=$(stellar contract deploy \
    --wasm contracts/.deploy/royalty_split.wasm \
    --source "${DEPLOYER_SECRET}" \
    --network "${NETWORK}" 2>&1)
ROYALTY_CONTRACT_ID=$(echo "${ROYALTY_OUTPUT}" | grep -oP 'Contract ID: \K[C][A-Z0-9]+' || echo "${ROYALTY_OUTPUT}")
echo "  Contract ID: ${ROYALTY_CONTRACT_ID}"
echo "${ROYALTY_CONTRACT_ID}" > contracts/.deploy/royalty_split.contract_id

# Deploy License Manager
echo "Deploying LicenseManager..."
LICENSE_OUTPUT=$(stellar contract deploy \
    --wasm contracts/.deploy/license_manager.wasm \
    --source "${DEPLOYER_SECRET}" \
    --network "${NETWORK}" 2>&1)
LICENSE_CONTRACT_ID=$(echo "${LICENSE_OUTPUT}" | grep -oP 'Contract ID: \K[C][A-Z0-9]+' || echo "${LICENSE_OUTPUT}")
echo "  Contract ID: ${LICENSE_CONTRACT_ID}"
echo "${LICENSE_CONTRACT_ID}" > contracts/.deploy/license_manager.contract_id

echo ""
echo "--- Step 3: Initialize Contracts ---"
echo ""

# Get deployer public key
# Try: identity name → derive from secret → fallback
DEPLOYER_PUBLIC=""
if command -v node &>/dev/null && [ -f "apps/api/node_modules/@stellar/stellar-sdk/lib/index.js" ] || [ -d "node_modules/@stellar/stellar-sdk" ]; then
  DEPLOYER_PUBLIC=$(cd /home/jinggaworld/Jingga/apps/api && node -e "
    const { Keypair } = require('@stellar/stellar-sdk');
    try {
      const kp = Keypair.fromSecret(process.env.DEPLOYER_SECRET_KEY);
      console.log(kp.publicKey());
    } catch(e) { process.exit(1); }
  " 2>/dev/null || echo "")
fi
if [ -z "${DEPLOYER_PUBLIC}" ]; then
  DEPLOYER_PUBLIC="GDEB5U56S3WIT3IFIKWTQ2UZPWOLR3W22QHBEV3I4PHBFOHH2BUVYRJH"
fi

echo "Initializing RoyaltySplit with deployer: ${DEPLOYER_PUBLIC}"
stellar contract invoke \
    --id "${ROYALTY_CONTRACT_ID}" \
    --source "${DEPLOYER_SECRET}" \
    --network "${NETWORK}" \
    -- \
    initialize \
    --admin "${DEPLOYER_PUBLIC}"

echo "Initializing LicenseManager with deployer: ${DEPLOYER_PUBLIC}"
stellar contract invoke \
    --id "${LICENSE_CONTRACT_ID}" \
    --source "${DEPLOYER_SECRET}" \
    --network "${NETWORK}" \
    -- \
    initialize \
    --admin "${DEPLOYER_PUBLIC}"

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "RoyaltySplit:  ${ROYALTY_CONTRACT_ID}"
echo "LicenseManager: ${LICENSE_CONTRACT_ID}"
echo ""
echo "Contract IDs saved to:"
echo "  contracts/.deploy/royalty_split.contract_id"
echo "  contracts/.deploy/license_manager.contract_id"
echo ""
echo "To interact with the contracts:"
echo "  stellar contract invoke --id ${ROYALTY_CONTRACT_ID} --source <KEY> --network ${NETWORK} -- <function_name> <args>"
echo ""
