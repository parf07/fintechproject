const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);

  // ~3.17% APR equivalent per year: 1e18 * 0.0317 / 365d / 24h / 3600s
  const initialMultiplier = "1000000000";

  const VaultV1 = await ethers.getContractFactory("VaultV1");
  const proxy = await upgrades.deployProxy(VaultV1, [initialMultiplier], {
    initializer: "initialize",
    kind: "uups",
  });
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`Vault proxy deployed to: ${proxyAddress}`);
  console.log(`Vault implementation deployed to: ${implementationAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
