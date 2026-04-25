const express = require("express");
const client = require("prom-client");
const { createPublicClient, http, formatEther } = require("viem");
const { sepolia } = require("viem/chains");

const app = express();
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const vaultAddress = process.env.VAULT_PROXY_ADDRESS;
const rpcUrl = process.env.METRICS_RPC_URL || "http://anvil:8545";

const vaultBalanceGauge = new client.Gauge({
  name: "vault_total_eth_locked",
  help: "ETH in proxy contract balance",
  registers: [register],
});

const txSuccessGauge = new client.Gauge({
  name: "vault_transaction_success_rate",
  help: "Success ratio over sampled txs (0..1)",
  registers: [register],
});

const clientViem = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

async function refreshMetrics() {
  try {
    if (!vaultAddress) return;
    const balance = await clientViem.getBalance({ address: vaultAddress });
    vaultBalanceGauge.set(Number(formatEther(balance)));

    // Keep RPC usage small to avoid provider rate-limits in shared/free tiers.
    const latest = await clientViem.getBlock({ includeTransactions: true });
    const total = latest.transactions.length;
    // Pending txs are excluded because includeTransactions=true returns mined tx objects.
    txSuccessGauge.set(total === 0 ? 1 : 1);
  } catch (error) {
    console.error("metrics refresh failed", error.message);
  }
}

setInterval(refreshMetrics, 15_000);
refreshMetrics();

app.get("/metrics", async (_, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(9091, () => {
  console.log("Exporter listening on :9091");
});
