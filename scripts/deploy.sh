#!/bin/bash
set -e

# Usage: ./scripts/deploy.sh <network> <token_address> <admin_address>
# e.g., ./scripts/deploy.sh testnet C... G...

NETWORK=$1
TOKEN_ADDRESS=$2
ADMIN_ADDRESS=$3

if [ -z "$NETWORK" ] || [ -z "$TOKEN_ADDRESS" ] || [ -z "$ADMIN_ADDRESS" ]; then
  echo "Usage: ./deploy.sh <network> <token_address> <admin_address>"
  exit 1
fi

echo "Deploying SoroTask contract on network: $NETWORK"

# Build the contract
echo "Building the contract..."
cd contract
cargo build --target wasm32-unknown-unknown --release
# Optimize if soroban-cli is up to date (optional):
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/soro_task_contract.wasm
cd ..

WASM_FILE="contract/target/wasm32-unknown-unknown/release/soro_task_contract.optimized.wasm"

if [ ! -f "$WASM_FILE" ]; then
    # Fallback to standard release Wasm if compression isn't configured
    WASM_FILE="contract/target/wasm32-unknown-unknown/release/soro_task_contract.wasm"
fi

echo "Deploying $WASM_FILE ..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm $WASM_FILE \
  --source admin \
  --network $NETWORK)

echo "Contract deployed successfully! Contract ID: $CONTRACT_ID"

echo "Initializing the contract..."
soroban contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network $NETWORK \
  -- \
  init \
  --token $TOKEN_ADDRESS \
  --admin $ADMIN_ADDRESS

echo "Contract initialized!"
echo "Setup complete."
