const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Vault UUPS", function () {
  async function deployFixture() {
    const [owner, user] = await ethers.getSigners();
    const VaultV1 = await ethers.getContractFactory("VaultV1");
    const vault = await upgrades.deployProxy(VaultV1, [1_000_000_000n], {
      initializer: "initialize",
      kind: "uups",
    });
    await vault.waitForDeployment();
    return { vault, owner, user };
  }

  it("handles deposit and withdraw with rewards", async function () {
    const { vault, user } = await deployFixture();
    const depositAmount = ethers.parseEther("1");

    await vault.connect(user).deposit({ value: depositAmount });
    expect(await vault.principalBalance(user.address)).to.equal(depositAmount);

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    const pending = await vault.pendingRewards(user.address);
    expect(pending).to.be.gt(0n);

    await expect(vault.connect(user).withdraw(ethers.parseEther("0.5"))).to.emit(vault, "Withdrawn");
  });

  it("preserves state after upgrade and doubles multiplier", async function () {
    const { vault, user } = await deployFixture();
    await vault.connect(user).deposit({ value: ethers.parseEther("2") });
    const before = await vault.totalEthLocked();

    const VaultV2 = await ethers.getContractFactory("VaultV2");
    const upgraded = await upgrades.upgradeProxy(await vault.getAddress(), VaultV2, {
      kind: "uups",
      unsafeAllow: ["missing-initializer"],
    });

    const oldMultiplier = await upgraded.rewardMultiplier();
    await upgraded.doubleRewardMultiplier();
    const newMultiplier = await upgraded.rewardMultiplier();

    expect(newMultiplier).to.equal(oldMultiplier * 2n);
    expect(await upgraded.totalEthLocked()).to.equal(before);
  });
});
