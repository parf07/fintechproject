const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = process.env.VAULT_PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("Missing VAULT_PROXY_ADDRESS in .env");
  }

  const VaultV2 = await ethers.getContractFactory("VaultV2");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, VaultV2, {
    kind: "uups",
    unsafeAllow: ["missing-initializer"],
  });
  await upgraded.waitForDeployment();

  console.log(`Vault upgraded at proxy: ${proxyAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
