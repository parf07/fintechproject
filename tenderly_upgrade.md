# Tenderly Upgrade Simulation (V1 -> V2)

## Goal
Upgrade the UUPS proxy from `VaultV1` to `VaultV2`, call `doubleRewardMultiplier()`, and confirm:
- `totalEthLocked` remains unchanged.
- user balances remain intact.

## Steps
1. Deploy `VaultV1` proxy on Sepolia:
   - `npm run deploy:sepolia`
2. Create a Tenderly Fork from Sepolia.
3. Set fork RPC as `SEPOLIA_RPC_URL` and run:
   - `npm run upgrade:sepolia`
4. On the fork, call `doubleRewardMultiplier()`.
5. Compare before/after values:
   - `totalEthLocked`
   - `principalBalance(user)`
   - `pendingRewards(user)` (should grow faster post-upgrade)

## Expected result
- `totalEthLocked` unchanged by upgrade itself.
- `rewardMultiplier` exactly doubled.
- Existing state preserved.
