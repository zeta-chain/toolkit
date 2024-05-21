// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";

contract OnlySystem {
    SystemContract internal systemContract;
    mapping(uint256 => address) private systemContracts;

    error OnlySystemContract(string);

    constructor() {
        address _systemContractAddress = _initializeSystemContracts();
        systemContract = SystemContract(_systemContractAddress);
    }

    function _initializeSystemContracts() private returns (address) {
        systemContracts[7000] = 0x91d18e54DAf4F677cB28167158d6dd21F6aB3921;
        systemContracts[7001] = 0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B;
        return systemContracts[block.chainid];
    }

    modifier onlySystem() {
        if (msg.sender != address(systemContract)) {
            revert OnlySystemContract(
                "Only system contract can call this function"
            );
        }
        _;
    }
}
