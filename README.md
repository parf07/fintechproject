# ETH Deposit Vault (UUPS) + Audit + Dashboard + Monitoring

This project implements a UUPS-upgradeable ETH vault with deposit/withdraw logic, time-based rewards, security remediation notes, a Wagmi dashboard, and Dockerized monitoring.

## 1) Smart contract
- UUPS proxy pattern with `initialize(...)` (no constructor initialization).
- `deposit()` and `withdraw()` implemented.
- `rewardMultiplier` (1e18 precision, per-second factor).
- Interest computed from elapsed block time via `pendingRewards(...)` and `_accrueRewards(...)`.

### Run contract checks
```bash
npm run compile
npm test
```

## 2) Aderyn audit
- Report: `aderyn_report.md`
- Fixed vulnerabilities include:
  - uninitialized implementation (`_disableInitializers()`)
  - reentrancy risk (`nonReentrant`)

## 3) Frontend (Vite + React + Wagmi)
- Reads:
  - `principalBalance(user)`
  - `pendingRewards(user)`
- Deposit UX states:
  - pending
  - success (with tx link)
  - error

### Start frontend
```bash
cp .env.example .env
npm run frontend:dev
```

### MetaMask/Sepolia setup
- Add/import your wallet in MetaMask.
- Switch to **Sepolia**.
- Set `VITE_SEPOLIA_RPC_URL` in `.env`.
- Set deployed proxy at `VITE_VAULT_PROXY_ADDRESS`.

## 4) Docker + monitoring stack
```bash
docker compose up --build
```

Services:
- Vite app: `http://localhost:5173`
- Anvil: `http://localhost:8545`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

Grafana dashboard includes:
- `vault_total_eth_locked`
- `vault_transaction_success_rate`

## 5) Deployment and upgrade

### Deploy V1 to Sepolia
```bash
npm run deploy:sepolia
```

### Upgrade to V2 on Sepolia/fork
```bash
npm run upgrade:sepolia
```

More details: `tenderly_upgrade.md`.
