// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract VaultV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    mapping(address => uint256) public principalBalance;
    mapping(address => uint256) public accruedRewards;
    mapping(address => uint256) public lastAccrualTimestamp;

    uint256 public totalEthLocked;
    uint256 public rewardMultiplier; // 1e18 precision, applied per second.

    event Deposited(address indexed user, uint256 amount, uint256 principalAfter);
    event Withdrawn(address indexed user, uint256 amount, uint256 principalAfter);
    event RewardMultiplierUpdated(uint256 newMultiplier);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(uint256 initialRewardMultiplier) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        rewardMultiplier = initialRewardMultiplier;
    }

    function deposit() external payable nonReentrant {
        require(msg.value > 0, "ZERO_DEPOSIT");
        _accrueRewards(msg.sender);

        principalBalance[msg.sender] += msg.value;
        totalEthLocked += msg.value;

        emit Deposited(msg.sender, msg.value, principalBalance[msg.sender]);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "ZERO_WITHDRAW");
        _accrueRewards(msg.sender);

        uint256 principal = principalBalance[msg.sender];
        uint256 rewards = accruedRewards[msg.sender];
        uint256 totalAvailable = principal + rewards;
        require(totalAvailable >= amount, "INSUFFICIENT_BALANCE");

        uint256 fromRewards = amount <= rewards ? amount : rewards;
        uint256 fromPrincipal = amount - fromRewards;

        accruedRewards[msg.sender] = rewards - fromRewards;
        principalBalance[msg.sender] = principal - fromPrincipal;
        totalEthLocked -= fromPrincipal;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH_TRANSFER_FAILED");

        emit Withdrawn(msg.sender, amount, principalBalance[msg.sender]);
    }

    function pendingRewards(address user) public view returns (uint256) {
        uint256 elapsed = block.timestamp - lastAccrualTimestamp[user];
        if (elapsed == 0 || principalBalance[user] == 0) {
            return accruedRewards[user];
        }

        uint256 newlyAccrued = (principalBalance[user] * rewardMultiplier * elapsed) / 1e18;
        return accruedRewards[user] + newlyAccrued;
    }

    function updateRewardMultiplier(uint256 newMultiplier) external onlyOwner {
        rewardMultiplier = newMultiplier;
        emit RewardMultiplierUpdated(newMultiplier);
    }

    function _accrueRewards(address user) internal {
        uint256 currentTimestamp = block.timestamp;
        uint256 lastTimestamp = lastAccrualTimestamp[user];

        if (lastTimestamp == 0) {
            lastAccrualTimestamp[user] = currentTimestamp;
            return;
        }

        uint256 elapsed = currentTimestamp - lastTimestamp;
        if (elapsed > 0 && principalBalance[user] > 0) {
            uint256 newlyAccrued = (principalBalance[user] * rewardMultiplier * elapsed) / 1e18;
            accruedRewards[user] += newlyAccrued;
        }

        lastAccrualTimestamp[user] = currentTimestamp;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
