# Smart Contract Migration on Soroban

This document outlines the standardized operational process for introducing, releasing, and migrating smart contract code changes across `testnet` and `futurenet`. 

Because SoroTask relies on a `Persistent` state environment where task configurations and balances persist across runs, replacing our `.wasm` logic using the new *upgrade execution route* prevents any state-loss that would normally occur from deploying a new contract ID.

---

## 🏗 Prerequisites
Ensure that:
1. You have the latest `soroban-cli` installed and configured.
2. An `admin` identity is securely accessible via your CLI keys: `soroban keys generate admin`
3. Network variables (`testnet`/`futurenet`) are bound in the CLI config.

---

## 🚀 1. Initial Deployment (New Instance)

To deploy the service from scratch (usually only done during the initial project bootstrap):

```bash
# Deploys, installs, and initializes the state
./scripts/deploy.sh testnet <TOKEN_ADDRESS> <ADMIN_ADDRESS>
```

**What this does:**
- Triggers `cargo build --target wasm32-unknown-unknown --release`
- Uploads the `.wasm` binary up to the designated network.
- Resolves the contract ID and automatically invokes the `init()` method passing `--token` and importantly the `--admin` parameter mapped to the `DataKey::Admin` slot.

---

## 🔄 2. Migration & Upgrade (Overwriting Existing Instance)

Once live, tasks register and gas funds execute natively. When we require bug fixes or new features logically mapped inside the contract, we execute an Upgrade!

```bash
# Installs new compiled code and instructs the old instance to transition over
./scripts/upgrade.sh testnet <EXISTING_CONTRACT_ID>
```

**What this does:**
- Repackages the workspace to fetch the newest binary.
- Instead of using `deploy`, it relies on the `install` CLI to get the explicit **hash** of the `.wasm` bytecode on the ledger.
- Communicates directly to your existing smart contract ID, providing the `--new_wasm_hash`.
- The contract invokes `admin.require_auth()` via native Soroban traits ensuring only the deployed admin controls lifecycle migrations.
- Executes `env.deployer().update_current_contract_wasm(new_wasm_hash)`.

### Operational Hazards to Monitor:
- **Testnet/Futurenet Ledger Resets:** Keep an eye out for Stellar Network Resets where the global ledger is dumped. You will need to start from Phase 1 `deploy.sh` rather than an upgrade.
- **Admin Configuration Change:** If in the future we want to *change* the admin, an additional function like `transfer_admin` would need parity inside the Rust contract execution.

---
## 👷🏻 Continuous Integration

These scripts are fully compatible with CI/CD flows utilizing the standard `$SOROBAN_SECRET_KEY` variable mapping from GitHub equivalents.
