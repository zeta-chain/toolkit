// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";

contract OnlySystem {
    address internal systemContractAddress;

    error OnlySystemContract(string);

    constructor(address _systemContractAddress) {
        systemContractAddress = _systemContractAddress;
    }

    modifier onlySystem() {
        if (msg.sender != systemContractAddress) {
            revert OnlySystemContract(
                "Only system contract can call this function"
            );
        }
        _;
    }
}
