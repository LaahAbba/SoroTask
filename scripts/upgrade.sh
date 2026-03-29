#!/bin/bash
set -e

# Usage: ./scripts/upgrade.sh <network> <contract_id>
# e.g., ./scripts/upgrade.sh testnet CA...

NETWORK=$1
CONTRACT_ID=$2

if [ -z "$NETWORK" ] || [ -z "$CONTRACT_ID" ]; then
  echo "Usage: ./upgrade.sh <network> <contract_id>"
  exit 1
fi

echo "Upgrading SoroTask contract $CONTRACT_ID on network: $NETWORK"

# Build the new contract Wasm
echo "Building the new contract..."
cd contract
cargo build --target wasm32-unknown-unknown --release
# Optional: Use soroban optimized output
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/soro_task_contract.wasm
cd ..

WASM_FILE="contract/target/wasm32-unknown-unknown/release/soro_task_contract.optimized.wasm"
if [ ! -f "$WASM_FILE" ]; then
    WASM_FILE="contract/target/wasm32-unknown-unknown/release/soro_task_contract.wasm"
fi

# 1. Install the new wasm code (Does not execute init/upgrade on itself, just stores it)
echo "Installing the new wasm logic..."
NEW_WASM_HASH=$(soroban contract install \
  --wasm $WASM_FILE \
  --source admin \
  --network $NETWORK)

echo "New Wasm Hash installed: $NEW_WASM_HASH"

# 2. Invoke the upgrade() endpoint on the currently active contract
echo "Triggering the upgrade endpoint to migrate execution logic..."
soroban contract invoke \
  --id $CONTRACT_ID \
  --source admin \
  --network $NETWORK \
  -- \
  upgrade \
  --new_wasm_hash $NEW_WASM_HASH

echo "Upgrade completed successfully!"
