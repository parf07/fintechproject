// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VaultV1} from "./VaultV1.sol";

contract VaultV2 is VaultV1 {
    function initializeV2() external reinitializer(2) {}

    function version() external pure returns (string memory) {
        return "V2";
    }

    function doubleRewardMultiplier() external onlyOwner {
        rewardMultiplier = rewardMultiplier * 2;
    }
}
