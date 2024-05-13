// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";

contract OnlySystem {
    error OnlySystemContract(string);

    modifier onlySystem(SystemContract systemContract) {
        if (msg.sender != address(systemContract)) {
            revert OnlySystemContract(
                "Only system contract can call this function"
            );
        }
        _;
    }
}
