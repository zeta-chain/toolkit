// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract OnlySystem {
    error OnlySystemContract(string);

    modifier onlySystem(address systemContract) {
        if (msg.sender != address(systemContract)) {
            revert OnlySystemContract(
                "Only system contract can call this function"
            );
        }
        _;
    }
}
